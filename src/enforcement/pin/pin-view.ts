import type { Constraint } from '../../shared/types/constraint';
import { validatePin } from '../../shared/services/validation-service';
import { isPinRequiredButNotConfigured } from '../../shared/services/pin-service';

/**
 * PIN's copy is unusually simple relative to Checkpoint/Delay: the
 * headline ("This site requires your PIN.") is domain-free by
 * construction in both the public and private cases
 * (BOOMRNG-V2-DESIGN-SPEC.md §14/§26 — "already domain-free"), and PIN
 * displays no personal reason at all (absent from §14's body text, §21's
 * microcopy table, and the locked prototype's `#pin-root` markup). The
 * *only* thing that varies between public and private for the normal
 * verification state is whether the domain chip renders.
 *
 * `showUnavailable` is the separate, now-locked contract for
 * `constraint.behavior === 'pin-required'` with no global PIN configured
 * (BOOMRNG-V2-DESIGN-SPEC.md §30.3, resolved): PIN verification is not
 * offered at all in that state — there is no configured PIN a candidate
 * could ever be correct against, so falling through to normal
 * verification would incorrectly tell the user their PIN was *wrong*
 * rather than *nonexistent*. `showDomain` still applies independently in
 * this state (the public unavailable view may still name the domain).
 */
export interface PinView {
  showDomain: boolean;
  showUnavailable: boolean;
}

/**
 * Missing domain and missing/unmatched constraint (deleted/edited race)
 * both fall back to "nothing to hide, proceed normally" — same
 * precedent as Checkpoint/Delay. A missing constraint also can't be
 * pin-required-but-unconfigured by definition (there's no behavior to
 * check), so `showUnavailable` is `false` in that case too — normal
 * verification is offered rather than inventing a third state.
 */
export function buildPinView(domain: string | null, constraint: Constraint | null, settingsPin: string | null): PinView {
  const isPrivate = constraint?.isPrivate ?? false;
  const showDomain = Boolean(domain) && !isPrivate;
  const showUnavailable = constraint ? isPinRequiredButNotConfigured(constraint.behavior, settingsPin) : false;
  return { showDomain, showUnavailable };
}

export const PIN_MAX_LENGTH = 6;

/**
 * A candidate is ready to submit exactly when it's a well-formed PIN by
 * the one existing format contract (`validation-service.ts`'s
 * `validatePin`, the same function Settings' Set/Change PIN fields
 * already use): 4-6 digits, digits only. Reused rather than re-derived
 * so the enforcement page can never drift from Settings on what counts
 * as a validly-shaped PIN.
 */
export function isSubmittablePin(candidate: string): boolean {
  return validatePin(candidate);
}

/**
 * Auto-submits the instant the field reaches its maximum length
 * (BOOMRNG-V2-DESIGN-SPEC.md §14: "Auto-submits on the 6th digit, or on
 * Enter at 4-6 digits"). Also re-checks format, not just length, so a
 * paste of 6 non-digit characters can reach the max length without
 * silently auto-firing a submission that would just read as "wrong PIN."
 */
export function shouldAutoSubmit(candidate: string): boolean {
  return candidate.length === PIN_MAX_LENGTH && isSubmittablePin(candidate);
}
