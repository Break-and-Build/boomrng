import type { Constraint } from '../../shared/types/constraint';

/**
 * Same range and default `ConstraintForm`/`validation-service.ts` already
 * enforce at creation/edit/import time (1–120 minutes, default 15) — the
 * ONLY existing normalization contract for this field anywhere in the
 * codebase. Reused here rather than inventing a new fallback: a
 * `delay`-behavior constraint can never actually be *saved* with an
 * out-of-range or missing `delayMinutes` through any in-app path (create,
 * edit, or import all validate this before writing), so a value that
 * fails this check here can only be pre-existing/legacy data or storage
 * written outside the app — genuinely malformed, not a normal case.
 */
const MIN_DELAY_MINUTES = 1;
const MAX_DELAY_MINUTES = 120;
const DEFAULT_DELAY_MINUTES = 15;

export function resolveDelayMinutes(constraint: Constraint | null): number {
  const value = constraint?.delayMinutes;
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_DELAY_MINUTES;
  if (value < MIN_DELAY_MINUTES || value > MAX_DELAY_MINUTES) return DEFAULT_DELAY_MINUTES;
  return value;
}

export function computeDelayEndTime(now: number, delayMinutes: number): number {
  return now + delayMinutes * 60_000;
}

/**
 * What `boomrng_delay_ends_<domain>` actually stores. `constraintId` is
 * what makes this ownable rather than merely domain-scoped: two
 * *different* Delay constraints (an old one deleted, a new one created)
 * for the same domain must never share timing, since the domain-only key
 * cannot otherwise distinguish "the same constraint, still counting down"
 * from "an unrelated constraint that happens to reuse this domain."
 * `delayMinutes` is the total the stored `endTime` was actually computed
 * against — kept alongside it (not re-derived from whatever the *live*
 * constraint says right now) so the ring's fraction stays internally
 * consistent with the countdown it's actually tracking even if the live
 * constraint's configured duration has since changed.
 */
export interface StoredDelayState {
  endTime: number;
  constraintId: string;
  delayMinutes: number;
}

/**
 * Accepts only the current, ownership-aware shape. A bare number (the
 * pre-fix format, written before `constraintId` existed) or anything
 * malformed returns `null` — treated identically to "nothing stored yet"
 * rather than trusted, since it carries no proof of which constraint it
 * belongs to. This is a one-time, harmless migration cost (at most one
 * delay restarts once per domain across the upgrade), not an ongoing
 * behavior.
 */
export function parseStoredDelayState(raw: unknown): StoredDelayState | null {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    typeof (raw as Record<string, unknown>).endTime === 'number' &&
    typeof (raw as Record<string, unknown>).constraintId === 'string' &&
    typeof (raw as Record<string, unknown>).delayMinutes === 'number'
  ) {
    return raw as StoredDelayState;
  }
  return null;
}

/**
 * The ownership check at the heart of the stale-state fix: stored timing
 * is only ever reused for the *exact same* constraint (by stable `id`)
 * that is currently live for this domain, and only while it hasn't
 * already elapsed. A constraint-ID mismatch — the domain's Delay
 * constraint was deleted and a different one later created — is treated
 * exactly like no stored state existing at all, never like something to
 * reconcile with the new constraint's configuration.
 *
 * Deliberately does NOT compare `stored.delayMinutes` against the live
 * constraint's current `delayMinutes` — a same-ID edit (the constraint
 * itself was reconfigured, not replaced) is a distinct, spec-ambiguous
 * product question (BOOMRNG-V2-DESIGN-SPEC.md has no text governing
 * "edit an already-active Delay's duration") that this function
 * deliberately does not decide. Only identity (a genuinely different
 * constraint) invalidates stored state here.
 */
export function isStoredStateUsable(stored: StoredDelayState | null, constraintId: string | null, now: number): boolean {
  if (!stored || !constraintId) return false;
  if (stored.constraintId !== constraintId) return false;
  return stored.endTime > now;
}

export interface DelayTiming {
  endTime: number;
  totalMs: number;
  /** Whether existing stored state was reused (true) or a fresh window was just computed (false) — callers use this to decide whether a fresh value needs persisting. */
  reused: boolean;
}

/**
 * The single, pure decision point combining ownership + freshness: reuse
 * stored timing only when it demonstrably belongs to the constraint that
 * is live right now, otherwise compute a fresh window from the live
 * constraint's own configured duration. `totalMs` always tracks whichever
 * duration actually produced `endTime` — the stored one when reusing, the
 * live one when computing fresh — so a caller's ring-fraction math
 * (`remaining / total`) can never exceed 1 from a mismatched pairing.
 */
export function resolveDelayTiming(
  stored: StoredDelayState | null,
  constraintId: string | null,
  liveDelayMinutes: number,
  now: number
): DelayTiming {
  if (isStoredStateUsable(stored, constraintId, now)) {
    return { endTime: stored!.endTime, totalMs: stored!.delayMinutes * 60_000, reused: true };
  }
  return { endTime: computeDelayEndTime(now, liveDelayMinutes), totalMs: liveDelayMinutes * 60_000, reused: false };
}

export function getRemainingMs(endTime: number, now: number): number {
  return Math.max(0, endTime - now);
}

export function isDelayComplete(remainingMs: number): boolean {
  return remainingMs <= 0;
}

/** Whole minutes for the running readout — ceiling, floored at 1, so the display never reads "0 min" while still genuinely running (BOOMRNG-V2-DESIGN-SPEC.md §13's "12 min" style readout, not a live mm:ss clock). */
export function formatRemainingMinutes(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}

export interface DelayView {
  showDomain: boolean;
  isComplete: boolean;
  /** The dominant large readout — "12 min" while running, "Ready." once complete. */
  readout: string;
  /** The supporting line beneath the readout. */
  subCopy: string;
  /** Only meaningful once `isComplete`; the label for the Continue action. */
  continueLabel: string;
  /** 1 = just started (ring fully open), 0 = complete (ring fully closed) — for the arc's stroke-dashoffset. */
  ringFraction: number;
}

/**
 * Pure derivation of what Delay's DOM should show — mirrors
 * `checkpoint-view.ts`'s `buildCheckpointView`. A missing/unmatched
 * constraint (deleted or edited after the DNR rule that redirected here
 * was generated) falls back to public/normal copy using the domain from
 * the URL, the same precedent Checkpoint already established, since
 * there is no privacy signal available to justify withholding it.
 *
 * Copy is taken verbatim from the locked V2 prototype
 * (design/v2-prototype/app.js's `delay.set`), which is more concrete than
 * BOOMRNG-V2-DESIGN-SPEC.md §13's own prose paraphrase and §21's
 * microcopy table (neither contradicts it, both are looser): "12 min" /
 * "remaining · this will be ready shortly." while running, "Ready." /
 * "[domain] is available again." (or the domain-generic private variant)
 * on completion, "Continue to [domain]" (public) / "Continue anyway"
 * (private) once available.
 */
export function buildDelayView(domain: string | null, constraint: Constraint | null, remainingMs: number, totalMs: number): DelayView {
  const isPrivate = constraint?.isPrivate ?? false;
  const showDomain = Boolean(domain) && !isPrivate;
  const complete = isDelayComplete(remainingMs);

  const readout = complete ? 'Ready.' : `${formatRemainingMinutes(remainingMs)} min`;

  const subCopy = complete
    ? showDomain
      ? `${domain} is available again.`
      : 'This site is available again.'
    : 'remaining · this will be ready shortly.';

  const continueLabel = showDomain ? `Continue to ${domain}` : 'Continue anyway';

  const ringFraction = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;

  return { showDomain, isComplete: complete, readout, subCopy, continueLabel, ringFraction };
}
