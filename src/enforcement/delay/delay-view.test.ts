import { describe, it, expect } from 'vitest';
import {
  resolveDelayMinutes,
  computeDelayEndTime,
  getRemainingMs,
  isDelayComplete,
  formatRemainingMinutes,
  buildDelayView,
  parseStoredDelayState,
  isStoredStateUsable,
  resolveDelayTiming,
  type StoredDelayState,
} from './delay-view';
import type { Constraint } from '../../shared/types/constraint';

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    domain: 'reddit.com',
    behavior: 'delay',
    delayMinutes: 12,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

describe('resolveDelayMinutes — reuses the existing validation-service contract, invents nothing new', () => {
  it('uses the configured delayMinutes when it is valid — this is the production bug fix (was hardcoded to 30s)', () => {
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: 12 }))).toBe(12);
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: 1 }))).toBe(1);
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: 120 }))).toBe(120);
  });

  it('falls back to 15 (the existing ConstraintForm default) for a null delayMinutes — e.g. a legacy/progressive-delay constraint that never set this field', () => {
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: null }))).toBe(15);
  });

  it('falls back to 15 for an out-of-range value (below the 1-120 validation-service bound)', () => {
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: 0 }))).toBe(15);
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: -5 }))).toBe(15);
  });

  it('falls back to 15 for an out-of-range value (above the 1-120 validation-service bound)', () => {
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: 121 }))).toBe(15);
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: 99999 }))).toBe(15);
  });

  it('falls back to 15 when no constraint is found at all', () => {
    expect(resolveDelayMinutes(null)).toBe(15);
  });

  it('falls back to 15 for a non-finite value (defensive against malformed storage)', () => {
    expect(resolveDelayMinutes(makeConstraint({ delayMinutes: NaN }))).toBe(15);
  });
});

describe('computeDelayEndTime / getRemainingMs — absolute end-time arithmetic, not a decrementing counter', () => {
  it('converts minutes to milliseconds exactly once', () => {
    const now = 1_000_000;
    expect(computeDelayEndTime(now, 12)).toBe(now + 12 * 60 * 1000);
    expect(computeDelayEndTime(now, 1)).toBe(now + 60_000);
  });

  it('remaining time is derived from the absolute end time and "now", not from ticking a counter down', () => {
    const endTime = 1_000_000;
    expect(getRemainingMs(endTime, 999_000)).toBe(1_000);
    expect(getRemainingMs(endTime, 500_000)).toBe(500_000);
  });

  it('never returns a negative remaining time once the end time has passed', () => {
    const endTime = 1_000_000;
    expect(getRemainingMs(endTime, 2_000_000)).toBe(0);
  });
});

describe('isDelayComplete', () => {
  it('is false while time remains and true at exactly zero or negative', () => {
    expect(isDelayComplete(1)).toBe(false);
    expect(isDelayComplete(0)).toBe(true);
    expect(isDelayComplete(-100)).toBe(true);
  });
});

describe('formatRemainingMinutes — coarse, minute-level readout, never "0 min" while still running', () => {
  it('rounds up to the next whole minute', () => {
    expect(formatRemainingMinutes(61_000)).toBe(2);
    expect(formatRemainingMinutes(60_000)).toBe(1);
    expect(formatRemainingMinutes(59_000)).toBe(1);
  });

  it('floors at 1 even for a handful of seconds remaining', () => {
    expect(formatRemainingMinutes(1_000)).toBe(1);
  });
});

describe('buildDelayView — running state', () => {
  it('names the domain in the sub copy only once complete; the running copy never varies by domain', () => {
    const view = buildDelayView('reddit.com', makeConstraint(), 12 * 60_000, 12 * 60_000);
    expect(view.isComplete).toBe(false);
    expect(view.readout).toBe('12 min');
    expect(view.subCopy).toBe('remaining · this will be ready shortly.');
  });

  it('ring fraction is 1 at the very start and shrinks toward 0 as time passes', () => {
    const total = 12 * 60_000;
    expect(buildDelayView('reddit.com', makeConstraint(), total, total).ringFraction).toBe(1);
    expect(buildDelayView('reddit.com', makeConstraint(), total / 2, total).ringFraction).toBeCloseTo(0.5);
    expect(buildDelayView('reddit.com', makeConstraint(), 0, total).ringFraction).toBe(0);
  });
});

describe('buildDelayView — completion state', () => {
  it('switches the readout to "Ready." and names the domain in the completion + continue copy', () => {
    const view = buildDelayView('reddit.com', makeConstraint(), 0, 12 * 60_000);
    expect(view.isComplete).toBe(true);
    expect(view.readout).toBe('Ready.');
    expect(view.subCopy).toBe('reddit.com is available again.');
    expect(view.continueLabel).toBe('Continue to reddit.com');
  });
});

describe('buildDelayView — private constraint', () => {
  it('never names the domain in sub copy or continue label, in either state', () => {
    const running = buildDelayView('reddit.com', makeConstraint({ isPrivate: true }), 5 * 60_000, 12 * 60_000);
    expect(running.subCopy).not.toContain('reddit.com');

    const complete = buildDelayView('reddit.com', makeConstraint({ isPrivate: true }), 0, 12 * 60_000);
    expect(complete.subCopy).toBe('This site is available again.');
    expect(complete.continueLabel).toBe('Continue anyway');
    expect(complete.subCopy).not.toContain('reddit.com');
    expect(complete.continueLabel).not.toContain('reddit.com');
  });

  it('the running copy is already domain-generic by construction, same as the public case — no leak either way', () => {
    const view = buildDelayView('reddit.com', makeConstraint({ isPrivate: true }), 5 * 60_000, 12 * 60_000);
    expect(view.readout).toBe('5 min');
    expect(view.subCopy).toBe('remaining · this will be ready shortly.');
  });
});

describe('buildDelayView — missing domain / missing constraint fallback', () => {
  it('falls back to the private-style generic copy when the domain itself is unknown, same precedent as Checkpoint', () => {
    const view = buildDelayView(null, makeConstraint(), 0, 12 * 60_000);
    expect(view.showDomain).toBe(false);
    expect(view.subCopy).toBe('This site is available again.');
    expect(view.continueLabel).toBe('Continue anyway');
  });

  it('falls back to public/normal copy when the constraint record is not found but a domain is known (deleted/edited race)', () => {
    const view = buildDelayView('reddit.com', null, 0, 12 * 60_000);
    expect(view.showDomain).toBe(true);
    expect(view.subCopy).toBe('reddit.com is available again.');
  });
});

/**
 * REGRESSION SUITE for the real-Chrome stale-persistence bug: a
 * domain-only `boomrng_delay_ends_<domain>` key let an old, unrelated
 * Delay window (from a deleted/edited constraint) survive and be reused
 * by a logically new constraint for the same domain — reported as a
 * 1-minute constraint displaying ~4-5 minutes remaining, self-correcting
 * only once the stale window happened to elapse naturally.
 */
describe('parseStoredDelayState', () => {
  it('accepts the current, ownership-aware shape', () => {
    const raw = { endTime: 1000, constraintId: 'c1', delayMinutes: 5 };
    expect(parseStoredDelayState(raw)).toEqual(raw);
  });

  it('rejects the pre-fix bare-number format — no proof of ownership, treated as nothing stored', () => {
    expect(parseStoredDelayState(1_700_000_000_000)).toBeNull();
  });

  it('rejects null, undefined, and malformed shapes', () => {
    expect(parseStoredDelayState(null)).toBeNull();
    expect(parseStoredDelayState(undefined)).toBeNull();
    expect(parseStoredDelayState({})).toBeNull();
    expect(parseStoredDelayState({ endTime: 1000 })).toBeNull();
    expect(parseStoredDelayState({ endTime: 1000, constraintId: 5 })).toBeNull();
  });
});

describe('isStoredStateUsable — the ownership check', () => {
  const stored: StoredDelayState = { endTime: 10_000, constraintId: 'c1', delayMinutes: 1 };

  it('is usable for the same constraint ID while not yet elapsed', () => {
    expect(isStoredStateUsable(stored, 'c1', 5_000)).toBe(true);
  });

  it('is NOT usable once elapsed, even for the same constraint', () => {
    expect(isStoredStateUsable(stored, 'c1', 10_001)).toBe(false);
  });

  it('is NOT usable for a different constraint ID — this is the core fix: a deleted-then-recreated constraint for the same domain never inherits the old one\'s timing', () => {
    expect(isStoredStateUsable(stored, 'c2', 5_000)).toBe(false);
  });

  it('is NOT usable when nothing is stored', () => {
    expect(isStoredStateUsable(null, 'c1', 5_000)).toBe(false);
  });

  it('is NOT usable when there is no live constraint to own it', () => {
    expect(isStoredStateUsable(stored, null, 5_000)).toBe(false);
  });
});

describe('resolveDelayTiming — the single decision point', () => {
  it('reuses stored timing (and its own recorded total) for the same constraint, still active', () => {
    const stored: StoredDelayState = { endTime: 10_000, constraintId: 'c1', delayMinutes: 1 };
    const timing = resolveDelayTiming(stored, 'c1', 1, 5_000);
    expect(timing.reused).toBe(true);
    expect(timing.endTime).toBe(10_000);
    expect(timing.totalMs).toBe(60_000);
  });

  it('THE BUG: a different constraint ID for the same domain — stale state is discarded, not reconciled with the new constraint\'s configuration', () => {
    // The exact reported scenario: an old constraint (or an earlier
    // window) left ~4 minutes remaining; a new/edited constraint (a
    // different id) now configures 1 minute. Before the fix, the stale
    // endTime would have been reused as-is (the domain-only key can't
    // tell these apart). After the fix, constraintId mismatch means it's
    // discarded exactly like "nothing stored."
    const staleFromDeletedConstraint: StoredDelayState = {
      endTime: 5_000 + 4 * 60_000, // ~4 minutes left, belonging to constraint "old"
      constraintId: 'old',
      delayMinutes: 5,
    };
    const timing = resolveDelayTiming(staleFromDeletedConstraint, 'new', 1, 5_000);
    expect(timing.reused).toBe(false);
    expect(timing.endTime).toBe(5_000 + 1 * 60_000); // fresh 1-minute window from the live constraint
    expect(timing.totalMs).toBe(60_000);
  });

  it('computes a fresh window when nothing usable is stored at all', () => {
    const timing = resolveDelayTiming(null, 'c1', 15, 1_000);
    expect(timing.reused).toBe(false);
    expect(timing.endTime).toBe(1_000 + 15 * 60_000);
    expect(timing.totalMs).toBe(15 * 60_000);
  });

  it('computes a fresh window when the previously-stored window for the same constraint has already elapsed (ordinary, non-stale re-visit)', () => {
    const stored: StoredDelayState = { endTime: 900, constraintId: 'c1', delayMinutes: 1 };
    const timing = resolveDelayTiming(stored, 'c1', 1, 1_000);
    expect(timing.reused).toBe(false);
    expect(timing.endTime).toBe(1_000 + 60_000);
  });

  it('the pre-fix bare-number format is never trusted, even for what would otherwise be the same domain/window — forces one fresh, safe recomputation across the upgrade', () => {
    const legacyRaw = parseStoredDelayState(1_700_000_005_000); // pre-fix shape
    const timing = resolveDelayTiming(legacyRaw, 'c1', 1, 1_700_000_000_000);
    expect(legacyRaw).toBeNull();
    expect(timing.reused).toBe(false);
  });
});

/**
 * LOCKED V2 PRODUCT SEMANTIC (decided after the stale-timer investigation,
 * BOOMRNG-V2-DESIGN-SPEC.md §13's "An active Delay window snapshots its
 * duration" bullet): a Delay window snapshots `delayMinutes` the moment it
 * begins. Editing the SAME constraint's `delayMinutes` while that window
 * is still active must neither restart it, shorten it, nor extend it —
 * the edited value only applies to the next fresh window. This is
 * "Option A" from the real-Chrome QA reconciliation, explicitly chosen
 * over "recompute/restart immediately."
 */
describe('resolveDelayTiming — locked semantic: editing an active window\'s duration (Option A)', () => {
  it('A. SAME-ID INCREASE: a 1-minute window stays a 1-minute window after the constraint is edited up to 6 minutes', () => {
    const activeOneMinuteWindow: StoredDelayState = { endTime: 10_000, constraintId: 'A', delayMinutes: 1 };
    // Live constraint A now says 6 minutes (edited while the window above is still active).
    const timing = resolveDelayTiming(activeOneMinuteWindow, 'A', 6, 5_000);

    expect(timing.reused).toBe(true);
    expect(timing.endTime).toBe(10_000); // unchanged — not extended to a 6-minute finish
    expect(timing.totalMs).toBe(1 * 60_000); // ring math still uses the persisted 1-minute snapshot, not the live 6

    // Once this window is no longer usable (expired), the NEXT fresh window uses the edited 6 minutes.
    const nextWindow = resolveDelayTiming(activeOneMinuteWindow, 'A', 6, 10_001);
    expect(nextWindow.reused).toBe(false);
    expect(nextWindow.totalMs).toBe(6 * 60_000);
  });

  it('B. SAME-ID DECREASE: a 6-minute window stays a 6-minute window after the constraint is edited down to 1 minute', () => {
    const activeSixMinuteWindow: StoredDelayState = { endTime: 5_000 + 6 * 60_000, constraintId: 'A', delayMinutes: 6 };
    // Live constraint A now says 1 minute (edited while the window above is still active).
    const timing = resolveDelayTiming(activeSixMinuteWindow, 'A', 1, 5_000);

    expect(timing.reused).toBe(true);
    expect(timing.endTime).toBe(5_000 + 6 * 60_000); // unchanged — not shortened to complete after only 1 minute
    expect(timing.totalMs).toBe(6 * 60_000); // ring math still uses the persisted 6-minute snapshot, not the live 1

    // Once this window is no longer usable (expired), the NEXT fresh window uses the edited 1 minute.
    const nextWindow = resolveDelayTiming(activeSixMinuteWindow, 'A', 1, 5_000 + 6 * 60_000 + 1);
    expect(nextWindow.reused).toBe(false);
    expect(nextWindow.totalMs).toBe(1 * 60_000);
  });

  it('C. DIFFERENT CONSTRAINT ID: a same-domain replacement constraint never inherits another constraint\'s active window (regression already covered above, restated under this contract\'s own describe block for visibility)', () => {
    const activeWindowOwnedByA: StoredDelayState = { endTime: 5_000 + 6 * 60_000, constraintId: 'A', delayMinutes: 6 };
    const timing = resolveDelayTiming(activeWindowOwnedByA, 'B', 1, 5_000);
    expect(timing.reused).toBe(false);
    expect(timing.endTime).toBe(5_000 + 1 * 60_000);
    expect(timing.totalMs).toBe(1 * 60_000);
  });

  it('D. LEGACY BARE TIMESTAMP: the pre-fix unowned format is rejected even when the numbers would otherwise look like a plausible active window (regression already covered above, restated under this contract\'s own describe block for visibility)', () => {
    const legacy = parseStoredDelayState(5_000 + 6 * 60_000);
    expect(legacy).toBeNull();
    const timing = resolveDelayTiming(legacy, 'A', 1, 5_000);
    expect(timing.reused).toBe(false);
  });

  it('ring math (via buildDelayView) reflects the persisted snapshot end-to-end for a same-ID increase, not the live constraint\'s edited duration', () => {
    const activeOneMinuteWindow: StoredDelayState = { endTime: 60_000, constraintId: 'A', delayMinutes: 1 };
    const timing = resolveDelayTiming(activeOneMinuteWindow, 'A', 6, 30_000); // live constraint edited to 6 while 30s remain of the original 1-minute window
    const remainingMs = getRemainingMs(timing.endTime, 30_000);
    const view = buildDelayView('reddit.com', makeConstraint({ id: 'A', delayMinutes: 6 }), remainingMs, timing.totalMs);
    // Half of the ORIGINAL 1-minute window remains — not a tiny sliver of a 6-minute one.
    expect(view.ringFraction).toBeCloseTo(0.5);
    expect(view.readout).toBe('1 min'); // ceil(30s) = 1 min remaining of the 1-minute window, not ~6
  });
});

describe('ring-fraction consistency — Repro C (progress ring appeared stuck)', () => {
  it('REPRODUCTION: mismatched totalMs/remainingMs (the pre-fix bug) clamps ringFraction to 1 for the entire stale portion of the wait — this is why the ring looked like it wasn\'t progressing, not a separate rendering bug', () => {
    // Exactly the reported numbers: live constraint is 1 minute, but
    // (pre-fix) stale remaining time is ~4 minutes because totalMs and
    // remainingMs were derived from two different constraints.
    const remainingMsFromStaleState = 4 * 60_000;
    const totalMsFromLiveConstraintOnly = 1 * 60_000;
    const view = buildDelayView('reddit.com', makeConstraint({ delayMinutes: 1 }), remainingMsFromStaleState, totalMsFromLiveConstraintOnly);
    // Clamped, not >1 — but frozen at "fully open" for 3 of the 4 actual
    // remaining minutes before it can start moving at all.
    expect(view.ringFraction).toBe(1);
  });

  it('FIXED: once totalMs is resolved together with endTime via resolveDelayTiming (same source, always paired), the ring fraction moves smoothly and is never stuck at a clamped 1 partway through', () => {
    const stored: StoredDelayState = { endTime: 5_000 + 4 * 60_000, constraintId: 'c1', delayMinutes: 4 };
    const timing = resolveDelayTiming(stored, 'c1', 1 /* live constraint now says 1 min, irrelevant while reused */, 5_000);
    // totalMs correctly reflects the 4-minute window this endTime actually belongs to, not the live constraint's current (different) configuration.
    expect(timing.totalMs).toBe(4 * 60_000);

    const remainingAtStart = getRemainingMs(timing.endTime, 5_000);
    const remainingAtOneMinuteIn = getRemainingMs(timing.endTime, 5_000 + 60_000);
    const viewAtStart = buildDelayView('reddit.com', makeConstraint(), remainingAtStart, timing.totalMs);
    const viewOneMinuteIn = buildDelayView('reddit.com', makeConstraint(), remainingAtOneMinuteIn, timing.totalMs);
    expect(viewAtStart.ringFraction).toBe(1);
    expect(viewOneMinuteIn.ringFraction).toBeLessThan(1);
    expect(viewOneMinuteIn.ringFraction).toBeCloseTo(0.75);
  });
});
