import { domainSpecificityRank, DOMAIN_SPECIFICITY_CAP } from '../shared/utils/domain';

/**
 * Boomrng's one centralized DNR priority contract — every numeric
 * `priority` value assigned to any rule Boomrng generates (dynamic or
 * session) comes from here, so the three invariants below can never
 * silently drift out of sync across `rules-builder.ts` and
 * `continuation-service.ts`.
 *
 * Confirmed the complete rule inventory before designing this (no other
 * rule class exists anywhere in the codebase):
 * - Constraint redirect/block rules (dynamic, `rules-builder.ts`)
 * - Allowed-site exception rules (dynamic, `rules-builder.ts`)
 * - Continuation grants (session, `continuation-service.ts`)
 *
 * Root problem this replaces: a flat `priority: 1` for every constraint
 * redirect rule gave Chrome's own DNR engine no way to prefer a more
 * specific constraint (`docs.example.com`) over a broader one
 * (`example.com`) when both match the same request — confirmed via
 * Chrome's own documentation that rules of equal priority and equal
 * action type have **no defined tie-break** ("Browser vendors have
 * agreed not to standardize the order in which rules with the same
 * action and priority run... this can change between runs or browser
 * versions"). Specificity-based priority is the only way DNR itself can
 * be made to prefer the more specific constraint deterministically.
 *
 * Invariants this module exists to guarantee, unconditionally — not just
 * for realistic domain depths:
 * 1. Ordinary constraint redirects occupy a bounded band
 *    (`REDIRECT_PRIORITY_BASE` .. `REDIRECT_PRIORITY_BASE + span`).
 * 2. `ALLOWED_SITE_PRIORITY` is strictly above the maximum possible
 *    redirect priority — an explicit allow-list entry must always win
 *    over a block, regardless of how deep either domain is (previously
 *    true only because of the historical flat 1-vs-2 split; now true by
 *    construction of the band's fixed ceiling).
 * 3. `CONTINUATION_PRIORITY` is strictly above `ALLOWED_SITE_PRIORITY`
 *    (and therefore above every possible redirect priority too) — a
 *    granted Continue must always win, regardless of domain depth. This
 *    is a pure numeric change from continuation-service.ts's previous
 *    flat `3`; the grant/revoke/cleanup mechanics that value gates are
 *    completely unchanged.
 */

export const REDIRECT_PRIORITY_BASE = 1;

/** The lowest specificity rank `domainSpecificityRank()` can return for any domain `normalizeDomain()` accepts — a bare `host.tld` is 2 labels. Subtracted so a simple, non-overlapping domain like `example.com` keeps today's priority (1) unchanged. */
const MIN_DOMAIN_SPECIFICITY_RANK = 2;

/** Fixed ceiling on the redirect band — the same capped rank `domainSpecificityRank()` provides, not a second, independently-chosen cap. */
const MAX_REDIRECT_OFFSET = DOMAIN_SPECIFICITY_CAP - MIN_DOMAIN_SPECIFICITY_RANK;

export function redirectPriorityForDomain(domain: string): number {
  const rank = domainSpecificityRank(domain);
  const offset = Math.min(Math.max(rank - MIN_DOMAIN_SPECIFICITY_RANK, 0), MAX_REDIRECT_OFFSET);
  return REDIRECT_PRIORITY_BASE + offset;
}

/** Strictly above every value `redirectPriorityForDomain()` can ever return. */
export const ALLOWED_SITE_PRIORITY = REDIRECT_PRIORITY_BASE + MAX_REDIRECT_OFFSET + 1;

/** Strictly above `ALLOWED_SITE_PRIORITY`, and therefore above every possible redirect priority too. */
export const CONTINUATION_PRIORITY = ALLOWED_SITE_PRIORITY + 1;
