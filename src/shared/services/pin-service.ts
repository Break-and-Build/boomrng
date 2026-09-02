import type { ConstraintBehavior } from '../types/constraint';

/**
 * The one place a candidate PIN is compared against the stored PIN.
 * Before this, the enforcement PIN page's background handler and the
 * popup's own Settings/Sites screens each did this comparison inline,
 * independently (BOOMRNG-V2-DESIGN-SPEC.md §30.5). Settings/Sites are not
 * migrated to call this in Milestone 0 (out of scope — neither screen's
 * PIN UX is being touched this milestone); this exists so the
 * enforcement-page path has a single, tested implementation to call
 * instead of repeating the comparison, and so future callers have
 * something to converge on.
 *
 * Explicitly returns `false` whenever no PIN is configured — a `null`
 * stored PIN must never be satisfiable by any candidate, including an
 * empty string.
 */
export function verifyPin(candidate: string, storedPin: string | null): boolean {
  if (!storedPin) return false;
  return candidate === storedPin;
}

/**
 * True when a constraint requires a PIN to pass but the device currently
 * has none configured — reachable via a restored import (§26 Export/Import
 * privacy) even though normal Clear PIN and Forgot-PIN recovery both
 * prevent reaching this state through in-app action (§14, §30.3). This is
 * a data/state predicate only: what the PIN enforcement page should show
 * or do in this case is an explicitly open UX decision, not decided here.
 */
export function isPinRequiredButNotConfigured(behavior: ConstraintBehavior, pin: string | null): boolean {
  return behavior === 'pin-required' && !pin;
}
