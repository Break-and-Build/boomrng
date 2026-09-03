import type { Constraint, ConstraintBehavior } from '../types/constraint';
import type { Settings } from '../types/settings';
import { normalizeDomain } from '../utils/domain';
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
