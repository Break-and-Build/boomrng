import type { Constraint } from '../../shared/types/constraint';

/**
 * Pure derivation of what Hard Block's DOM should show, mirroring
 * `checkpoint-view.ts`/`delay-view.ts`/`pin-view.ts`'s pattern — kept free
 * of `document`/`chrome` so it's unit-testable directly under this repo's
 * `node` test environment (no jsdom); `block.ts` is the thin,
 * untested-at-this-level glue that reads this onto the actual page.
 *
 * Unlike the other three enforcement pages, Hard Block's headline
 * ("You've closed this one off.") is a single, constant string —
 * BOOMRNG-V2-DESIGN-SPEC.md §15/§21 lock it as "already domain-free,
 * identical in the private variant." There is no personal-reason display
 * (§23's screen inventory: Hard Block's secondary-action column is
 * "— (none)", and its "Important states" column lists only "Single
 * state; normal vs. private (domain withheld)" — no with/without-reason
 * variant the way Checkpoint/Delay have). The only thing that actually
 * varies is whether the domain chip renders.
 *
 * A missing domain is treated the same as a private constraint — same
 * precedent as every other enforcement page's view builder — though in
 * practice `reconcileStaleEnforcementPage()` already redirects away
 * before this is ever called with a `null` constraint; this stays
 * defensive for consistency with its siblings, not because that path is
 * expected to be reached.
 */
export interface BlockView {
  showDomain: boolean;
}

export function buildBlockView(domain: string | null, constraint: Constraint | null): BlockView {
  const isPrivate = constraint?.isPrivate ?? false;
  return { showDomain: Boolean(domain) && !isPrivate };
}
