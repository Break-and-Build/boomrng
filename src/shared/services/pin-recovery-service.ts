import type { Constraint } from '../types/constraint';
import { loadSettings, saveSettings, loadConstraints, saveConstraints } from '../storage/storage-service';
import { verifyPin } from './pin-service';

/**
 * A constraint that depends on the PIN existing at all — either it's
 * PIN-Required, or it's private (private constraints can only be
 * unlocked/edited/deleted via the same PIN, per
 * BOOMRNG-V2-DESIGN-SPEC.md §26). A constraint that is both counts once.
 * The single source of truth for "does this constraint need a PIN" —
 * Settings' Clear PIN gate and the forgot-PIN reset below both call this
 * rather than each re-deriving the same predicate.
 */
export function isPinProtected(constraint: Constraint): boolean {
  return constraint.isPrivate || constraint.behavior === 'pin-required';
}

/**
 * The single authorization decision Sites.tsx's edit/delete handlers make
 * before acting on a constraint. Not recovery-specific, but colocated
 * here because it composes `isPinProtected()` above directly rather than
 * re-deriving "does this constraint need a PIN" a second time —
 * everything actually pin-required or private must clear this before
 * being edited or deleted, closing the gap where a PIN-Required
 * constraint's own protection could be defeated by simply editing its
 * behavior away (or deleting it) from Sites, no PIN required, since
 * Sites previously only gated on `isPrivate`.
 *
 * Delegates the actual comparison to `verifyPin()` — the one place a
 * candidate is ever compared against the stored PIN — rather than a
 * second, parallel comparison. Returns `true` immediately, without
 * looking at the candidate at all, for any constraint `isPinProtected`
 * already says doesn't need one.
 */
export function authorizeConstraintMutation(constraint: Constraint, candidatePin: string, storedPin: string | null): boolean {
  if (!isPinProtected(constraint)) return true;
  return verifyPin(candidatePin, storedPin);
}

export interface PinResetResult {
  /** Count only — callers must never surface which domains were removed (BOOMRNG-V2-DESIGN-SPEC.md §14 forgot-PIN recovery). */
  deletedCount: number;
}

/**
 * Forgot-PIN recovery. This is deliberately NOT an unlock: it never checks
 * the PIN, never sets any session-unlock state, and never returns the
 * removed constraints themselves — only a count safe to show in a toast.
 * It permanently deletes every constraint the (now-forgotten) PIN was
 * protecting and clears the PIN so the product never ends up in a state
 * where protected constraints exist with no PIN able to reach them.
 * Public, non-protected constraints are left untouched.
 */
export async function resetPinAndDeleteProtectedConstraints(): Promise<PinResetResult> {
  const [settings, constraints] = await Promise.all([loadSettings(), loadConstraints()]);
  const remaining = constraints.filter((c) => !isPinProtected(c));
  const deletedCount = constraints.length - remaining.length;

  await Promise.all([saveSettings({ ...settings, pin: null }), saveConstraints(remaining)]);

  return { deletedCount };
}
