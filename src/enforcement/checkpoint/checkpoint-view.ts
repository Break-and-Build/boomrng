import type { Constraint } from '../../shared/types/constraint';

/**
 * Pure derivation of what Checkpoint's DOM should show, given the domain
 * from this page's own URL and the live constraint (or `null`) matching
 * it. Kept free of `document`/`chrome` so it can be unit-tested directly
 * under this repo's `node` test environment (no jsdom) — `checkpoint.ts`
 * is the thin, untested-at-this-level glue that reads these values onto
 * the actual page.
 *
 * A missing domain is treated the same as a private constraint: there is
 * nothing safe to name either way, and the private copy (§12/§26 of
 * BOOMRNG-V2-DESIGN-SPEC.md) already exists to be domain-generic.
 */
export interface CheckpointView {
  showDomain: boolean;
  headline: string;
  continueLabel: string;
  reason: string | null;
}

export function buildCheckpointView(domain: string | null, constraint: Constraint | null): CheckpointView {
  const isPrivate = constraint?.isPrivate ?? false;
  const showDomain = Boolean(domain) && !isPrivate;
  const reason = isPrivate ? null : constraint?.customMessage ?? null;

  return {
    showDomain,
    headline: showDomain ? `You were heading to ${domain}.` : 'This site is constrained.',
    continueLabel: showDomain ? `Continue to ${domain} anyway` : 'Continue anyway',
    reason,
  };
}
