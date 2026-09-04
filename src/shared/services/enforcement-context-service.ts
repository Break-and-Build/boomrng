import type { Constraint, ConstraintBehavior } from '../types/constraint';
import type { Settings } from '../types/settings';
import { normalizeDomain, isHostUnderConstraintDomain, domainSpecificityRank } from '../utils/domain';
import { loadConstraints, loadSettings } from '../storage/storage-service';

export interface EnforcementContext {
  /** The one constraint whose effective domain matches, or `null` if none does (e.g. it was deleted or edited after the DNR rule that redirected here was generated). */
  constraint: Constraint | null;
  settings: Settings;
}

/**
 * The live-storage counterpart to the old "everything in the redirect
 * URL" approach (BOOMRNG-V2-DESIGN-SPEC.md §30.1). An enforcement page
 * only needs the `domain` from its own URL to look up everything else —
 * `isPrivate`, `customMessage`, `delayMinutes`, and `behavior` all come
 * from the matching constraint returned here, always current as of the
 * moment the page loaded rather than a snapshot from whenever the DNR
 * rule was last regenerated.
 *
 * Matching uses the same canonical `normalizeDomain()` identity used
 * everywhere else a domain is compared (the creation/edit guard, DNR rule
 * generation) — §30.2's "one effective domain = one constraint" only
 * holds if every comparison in the codebase agrees on what "the same
 * domain" means.
 */
export function findMatchingConstraint(domain: string | null, constraints: Constraint[]): Constraint | null {
  const normalizedTarget = domain ? normalizeDomain(domain) : null;
  if (!normalizedTarget) return null;

  return constraints.find((c) => normalizeDomain(c.domain) === normalizedTarget) ?? null;
}

/**
 * Resolves which live constraint actually governs a *real, arbitrary*
 * navigated host — unlike `findMatchingConstraint()` above, whose every
 * production caller already knows the exact constraint domain it's
 * comparing against (an enforcement page's own already-resolved
 * `constraint.domain`, round-tripped for a background authorization
 * check). `checkAndEnforceTab()` (`tab-enforcement-service.ts`) and
 * `destination-capture-service.ts` are the two exceptions: both start
 * from a tab's or navigation's *live* URL, which could be any subdomain,
 * not something already tied to a specific constraint. Exact matching
 * there would miss a constraint on `example.com` for a tab actually
 * sitting on `docs.example.com` — a confirmed real-Chrome activation-time
 * enforcement gap.
 *
 * One-way `isHostUnderConstraintDomain()` finds every constraint whose
 * DNR scope actually covers `host` (self or ancestor domain — never the
 * reverse, so a constraint on `docs.example.com` never matches a plain
 * visit to `example.com`). When more than one candidate matches — a
 * `example.com` and a `docs.example.com` constraint both live, `host`
 * being `docs.example.com` — the most specific one wins, ranked by
 * `domainSpecificityRank()`, the exact same (capped) measure
 * `dnr-priority.ts`'s `redirectPriorityForDomain()` uses to assign DNR
 * priorities. This is deliberate, not incidental: DNR's own redirect
 * rules are now specificity-prioritized so a fresh navigation to
 * `docs.example.com` is redirected per the more specific constraint;
 * this function has to agree, using the identical ranking, or activation
 * re-checks and destination capture could enforce a *different*
 * constraint than DNR itself would have on a fresh navigation to the
 * same URL. A genuine tie between two *different* domains at equal rank
 * is not reachable in valid data — two domains can only both be
 * self-or-ancestor of the same host at equal specificity if they are the
 * identical string, and exact-duplicate domains are already rejected at
 * save time (`ConstraintForm.tsx`) — so this never actually falls back
 * to array order for a real ambiguity.
 */
export function findMostSpecificMatchingConstraint(host: string | null, constraints: Constraint[]): Constraint | null {
  if (!host) return null;

  const candidates = constraints.filter((c) => isHostUnderConstraintDomain(c.domain, host));
  if (candidates.length === 0) return null;

  return candidates.reduce((best, current) =>
    domainSpecificityRank(current.domain) > domainSpecificityRank(best.domain) ? current : best
  );
}

/**
 * The id-based counterpart to `findMatchingConstraint()` — BOOMRNG-V2-DESIGN-SPEC.md
 * §30.7's opaque-identity fix: enforcement URLs carry a constraint's own
 * stable `id` instead of its domain, so an id is exact-matched here
 * rather than needing any domain normalization at all.
 */
export function findConstraintById(id: string | null, constraints: Constraint[]): Constraint | null {
  if (!id) return null;
  return constraints.find((c) => c.id === id) ?? null;
}

/**
 * The single canonical mapping from a constraint's live `behavior` to the
 * enforcement page it belongs on — the same collapsing `rules-builder.ts`
 * uses to pick a DNR redirect target (legacy `reflection`/`custom-message`
 * /`scheduled` collapse onto Checkpoint's page, `progressive-delay` onto
 * Delay's), now shared rather than duplicated, so a page can also use it
 * to detect it has gone stale relative to the *current* live constraint
 * (BOOMRNG-V2-DESIGN-SPEC.md §30.9 — a plain refresh, or simply leaving a
 * page open while its constraint is edited elsewhere, never re-runs DNR:
 * the extension's own `chrome-extension://` URL never matches a block/
 * redirect rule's condition, so nothing forces a transition on its own).
 * An unrecognized/missing behavior falls back to Hard Block's page — the
 * same fail-safe default `rules-builder.ts`'s own switch already used.
 */
export function getEnforcementPagePath(behavior: ConstraintBehavior): string {
  switch (behavior) {
    case 'checkpoint':
    case 'reflection':
    case 'custom-message':
    case 'scheduled':
      return 'src/enforcement/checkpoint/index.html';
    case 'delay':
    case 'progressive-delay':
      return 'src/enforcement/delay/index.html';
    case 'pin-required':
      return 'src/enforcement/pin/index.html';
    case 'hard-block':
    default:
      return 'src/enforcement/block/index.html';
  }
}

export async function loadEnforcementContext(domain: string | null): Promise<EnforcementContext> {
  const [constraints, settings] = await Promise.all([loadConstraints(), loadSettings()]);
  return {
    constraint: findMatchingConstraint(domain, constraints),
    settings,
  };
}

/** The id-based counterpart to `loadEnforcementContext()` — see `findConstraintById()`. */
export async function loadEnforcementContextById(id: string | null): Promise<EnforcementContext> {
  const [constraints, settings] = await Promise.all([loadConstraints(), loadSettings()]);
  return {
    constraint: findConstraintById(id, constraints),
    settings,
  };
}
