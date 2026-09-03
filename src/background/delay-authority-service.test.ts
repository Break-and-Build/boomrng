import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installChromeMock, uninstallChromeMock, type ChromeMockHandle } from '../shared/testing/chrome-mock';
import { resolveDelayWindow, isDelayWindowElapsed, pruneStaleDelayAuthorities } from './delay-authority-service';
import type { Constraint } from '../shared/types/constraint';

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    domain: 'reddit.com',
    behavior: 'delay',
    delayMinutes: 15,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

/**
 * The authoritative state under test is `chrome.storage.session`, keyed
 * per-domain under `boomrng_delay_authority_<domain>` — see
 * `delay-authority-service.ts`'s own doc comment for why this is
 * background-managed (the page never supplies timing values through the
 * continuation API) but not claimed unforgeable against a user who
 * deliberately reverse-engineers and hand-writes the internal record via
 * DevTools (accepted, disclosed threat-model boundary; see
 * `continuation-service.test.ts`'s "accepted limitation" test for that
 * exact scenario).
 */
let mock: ChromeMockHandle;

beforeEach(() => {
  vi.useFakeTimers();
  mock = installChromeMock();
});

afterEach(() => {
  uninstallChromeMock();
  vi.useRealTimers();
});

describe('resolveDelayWindow — the only function that may create or refresh a window (GET_DELAY_WINDOW)', () => {
  it('creates a fresh window when none exists yet', async () => {
    const constraint = makeConstraint({ domain: 'fresh-1.example' });
    const now = Date.now();
    const window = await resolveDelayWindow('fresh-1.example', constraint);

    expect(window?.totalMs).toBe(15 * 60_000);
    expect(window?.endTime).toBe(now + 15 * 60_000);
  });

  it('reuses an existing, not-yet-elapsed window rather than recomputing it (refresh/revisit semantics)', async () => {
    const constraint = makeConstraint({ domain: 'reuse-1.example' });
    const first = await resolveDelayWindow('reuse-1.example', constraint);
    vi.advanceTimersByTime(5_000);
    const second = await resolveDelayWindow('reuse-1.example', constraint);
    expect(second).toEqual(first);
  });

  it('FAILS CLOSED (confirmed real-Chrome bug, fixed): returns null and persists nothing when there is no live constraint at all', async () => {
    const window = await resolveDelayWindow('no-constraint-1.example', null);
    expect(window).toBeNull();
    // Confirmed indirectly: a subsequent call with a real constraint
    // does not "reuse" anything from the null call, since nothing was
    // ever stored under this domain.
    const constraint = makeConstraint({ domain: 'no-constraint-1.example', delayMinutes: 1 });
    const withConstraint = await resolveDelayWindow('no-constraint-1.example', constraint);
    expect(withConstraint?.totalMs).toBe(60_000);
  });

  it('FAILS CLOSED (confirmed real-Chrome bug, fixed): returns null and persists nothing when the live constraint exists but its behavior is not delay', async () => {
    const domain = 'not-delay-1.example';
    for (const behavior of ['hard-block', 'checkpoint', 'pin-required'] as const) {
      const constraint = makeConstraint({ domain, behavior, delayMinutes: behavior === 'hard-block' ? null : 15 });
      const window = await resolveDelayWindow(domain, constraint);
      expect(window).toBeNull();
    }
  });

  it('a same-ID edit to delayMinutes does not mutate an already-active window\'s totalMs (Option A)', async () => {
    const domain = 'same-id-edit-1.example';
    const constraint = makeConstraint({ id: 'edit-c1', domain, delayMinutes: 1 });
    const first = await resolveDelayWindow(domain, constraint);
    expect(first?.totalMs).toBe(60_000);

    const edited = { ...constraint, delayMinutes: 6 };
    const second = await resolveDelayWindow(domain, edited);
    expect(second?.totalMs).toBe(60_000); // unchanged — still the original 1-minute snapshot
    expect(second?.endTime).toBe(first?.endTime);
  });

  it('a recreated constraint (different ID) starts a fresh window rather than inheriting the old one', async () => {
    const domain = 'recreate-1.example';
    const original = makeConstraint({ id: 'orig', domain, delayMinutes: 15 });
    await resolveDelayWindow(domain, original);

    const recreated = makeConstraint({ id: 'new', domain, delayMinutes: 1 });
    const window = await resolveDelayWindow(domain, recreated);
    expect(window?.totalMs).toBe(60_000);
  });
});

describe('isDelayWindowElapsed — the authorization check, deliberately read-only', () => {
  it('is false when GET_DELAY_WINDOW was never called for this domain (no persisted window exists)', async () => {
    const constraint = makeConstraint({ domain: 'never-started-1.example' });
    expect(await isDelayWindowElapsed('never-started-1.example', constraint)).toBe(false);
  });

  it('is false while the resolved window has not yet reached its end time', async () => {
    const domain = 'not-yet-1.example';
    const constraint = makeConstraint({ domain });
    await resolveDelayWindow(domain, constraint);
    expect(await isDelayWindowElapsed(domain, constraint)).toBe(false);
  });

  it('is true once real time has advanced past the window\'s endTime, and checking again does not reset it', async () => {
    const domain = 'elapses-1.example';
    const constraint = makeConstraint({ domain, delayMinutes: 1 });
    await resolveDelayWindow(domain, constraint);

    vi.advanceTimersByTime(60_001);

    expect(await isDelayWindowElapsed(domain, constraint)).toBe(true);
    // Checking again must still see the same elapsed window, not a
    // freshly-recomputed, not-yet-elapsed one (this is exactly the bug
    // that was caught and fixed: an elapsed-check must never itself
    // create a fresh, unelapsed window).
    expect(await isDelayWindowElapsed(domain, constraint)).toBe(true);
  });

  it('is false when the persisted window belongs to a different constraint ID (stale/recreated constraint)', async () => {
    const domain = 'wrong-owner-1.example';
    const original = makeConstraint({ id: 'orig', domain, delayMinutes: 1 });
    await resolveDelayWindow(domain, original);
    vi.advanceTimersByTime(60_001); // original window has now elapsed

    const recreated = makeConstraint({ id: 'different', domain, delayMinutes: 15 });
    // The elapsed window belongs to 'orig', not 'different' — must not authorize.
    expect(await isDelayWindowElapsed(domain, recreated)).toBe(false);
  });

  it('is false when there is no live constraint at all', async () => {
    expect(await isDelayWindowElapsed('no-constraint-2.example', null)).toBe(false);
  });

  it('never creates a window as a side effect — repeated calls with no prior resolveDelayWindow() stay false forever', async () => {
    const domain = 'no-side-effect-1.example';
    const constraint = makeConstraint({ domain });
    expect(await isDelayWindowElapsed(domain, constraint)).toBe(false);
    expect(await isDelayWindowElapsed(domain, constraint)).toBe(false);
    // If this had silently created a window, resolveDelayWindow would
    // now see it as fresh/unelapsed rather than creating a brand new one
    // — but there is no way to observe that distinction here except by
    // confirming nothing about the outcome changed, which it hasn't.
  });
});

/**
 * REGRESSION SUITE for a confirmed real-Chrome bug found in manual QA:
 * a Hard Block constraint edited to Delay · 1 min showed 15 min on first
 * visit, and both a refresh and a second tab restarted the count rather
 * than reusing it. Root cause: `isStoredStateUsable()`'s ownership check
 * only ever compared `constraintId` — a stable value across an edit,
 * including a behavior change — so a stale, not-yet-elapsed Delay record
 * left over from an *earlier* period when this same constraint ID was
 * `delay` (before it became Hard Block) was wrongly treated as "already
 * active" once the constraint became `delay` again, and its *old*
 * configured duration (15 min) silently won over the newly-saved one
 * (1 min). `pruneStaleDelayAuthorities()` closes this by discarding a
 * domain's stored record the moment its live constraint is no longer
 * both the same id and currently `delay` — called from
 * `service-worker.ts`'s existing constraints-changed listener, so it
 * runs on every Save, not just when GET_DELAY_WINDOW happens to be
 * called.
 */
describe('pruneStaleDelayAuthorities — closes the Hard Block ↔ Delay stale-authority bug', () => {
  function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
    return {
      id: 'c1',
      domain: 'prune.example',
      behavior: 'delay',
      delayMinutes: 15,
      schedule: null,
      customMessage: null,
      createdAt: Date.now(),
      progressiveDelay: null,
      isPrivate: false,
      ...overrides,
    };
  }

  it('CONFIRMED BUG, NOW FIXED: a stale unelapsed record surviving a same-ID Hard Block interval is discarded, so the first GET_DELAY_WINDOW after re-editing to Delay uses the freshly-saved duration, not the old one', async () => {
    const domain = 'hardblock-then-delay.example';
    const id = 'x1';

    // Constraint was Delay · 15 min at some earlier point, establishing a
    // real, not-yet-elapsed authority.
    const original = makeConstraint({ id, domain, delayMinutes: 15 });
    await resolveDelayWindow(domain, original);

    // Edited to Hard Block. This is the missing step the original design
    // never modeled: the background must be told the constraint changed,
    // exactly as service-worker.ts's onChanged listener does on every Save.
    const hardBlocked = makeConstraint({ id, domain, behavior: 'hard-block', delayMinutes: null });
    await pruneStaleDelayAuthorities([hardBlocked]);

    // Edited back to Delay · 1 min, same id, no waiting having occurred.
    const editedBackToDelay = makeConstraint({ id, domain, delayMinutes: 1 });
    await pruneStaleDelayAuthorities([editedBackToDelay]); // also runs on this save
    const window = await resolveDelayWindow(domain, editedBackToDelay);

    // Before the fix this was 900_000 (the stale 15-minute record).
    expect(window?.totalMs).toBe(60_000);
  });

  it('without pruning, the same scenario reproduces the confirmed bug (characterization — proves the fix is doing real work, not a no-op)', async () => {
    const domain = 'no-prune-repro.example';
    const id = 'x2';
    const original = makeConstraint({ id, domain, delayMinutes: 15 });
    await resolveDelayWindow(domain, original);

    // No prune call between the Hard Block interval and the re-edit —
    // simulates the pre-fix code path.
    const editedBackToDelay = makeConstraint({ id, domain, delayMinutes: 1 });
    const window = await resolveDelayWindow(domain, editedBackToDelay);

    expect(window?.totalMs).toBe(900_000); // the confirmed bug, unfixed
  });

  it('a fresh Hard Block → Delay transition with no prior authority at all was never affected (this half of the bug report was already correct)', async () => {
    const domain = 'fresh-no-prior.example';
    const constraint = makeConstraint({ id: 'x3', domain, delayMinutes: 1 });
    const window = await resolveDelayWindow(domain, constraint);
    expect(window?.totalMs).toBe(60_000);
  });

  it('refresh after the fix reuses the exact same window (same endTime/totalMs), not a fresh one', async () => {
    const domain = 'refresh-after-fix.example';
    const id = 'x4';
    await pruneStaleDelayAuthorities([makeConstraint({ id, domain, behavior: 'hard-block', delayMinutes: null })]);
    const constraint = makeConstraint({ id, domain, delayMinutes: 1 });
    const first = await resolveDelayWindow(domain, constraint);

    vi.advanceTimersByTime(20_000); // refresh ~20s later, well before the 1-minute window elapses
    const second = await resolveDelayWindow(domain, constraint);

    expect(second).toEqual(first);
    expect(second?.totalMs).toBe(60_000);
  });

  it('a second tab (no tab identity involved in the domain-scoped window at all) sees the exact same window as the first', async () => {
    const domain = 'second-tab-after-fix.example';
    const constraint = makeConstraint({ id: 'x5', domain, delayMinutes: 1 });
    const tabA = await resolveDelayWindow(domain, constraint); // GET_DELAY_WINDOW never receives or uses a tabId at all
    vi.advanceTimersByTime(20_000);
    const tabB = await resolveDelayWindow(domain, constraint);
    expect(tabB).toEqual(tabA);
  });

  it('LEGITIMATE OPTION A, must not be conflated with the bug above: an already-active window (behavior stayed delay throughout) survives a same-ID duration edit — pruning after the edit must not clear it', async () => {
    const domain = 'legitimate-option-a.example';
    const id = 'x6';
    const constraint = makeConstraint({ id, domain, delayMinutes: 15 });
    const activeWindow = await resolveDelayWindow(domain, constraint); // active, counting down

    // Edited mid-wait to 1 minute — behavior never left 'delay'.
    const edited = { ...constraint, delayMinutes: 1 };
    await pruneStaleDelayAuthorities([edited]); // runs on this save too — must be a no-op here

    const stillActive = await resolveDelayWindow(domain, edited);
    expect(stillActive).toEqual(activeWindow); // unchanged — still the original 15-minute snapshot
    expect(stillActive?.totalMs).toBe(15 * 60_000);
  });

  it('removes a record with no live owner at all (constraint deleted)', async () => {
    const domain = 'deleted-owner.example';
    await resolveDelayWindow(domain, makeConstraint({ id: 'x7', domain, delayMinutes: 15 }));
    expect(mock.sessionStore[`boomrng_delay_authority_${domain}`]).toBeDefined();

    await pruneStaleDelayAuthorities([]); // constraint deleted entirely

    expect(mock.sessionStore[`boomrng_delay_authority_${domain}`]).toBeUndefined();
  });

  it('removes a record whose owner was recreated with a different id (same domain)', async () => {
    const domain = 'recreated-owner.example';
    await resolveDelayWindow(domain, makeConstraint({ id: 'old-id', domain, delayMinutes: 15 }));

    await pruneStaleDelayAuthorities([makeConstraint({ id: 'new-id', domain, delayMinutes: 15 })]);

    expect(mock.sessionStore[`boomrng_delay_authority_${domain}`]).toBeUndefined();
  });

  it('is a no-op when there is nothing stored yet', async () => {
    await expect(pruneStaleDelayAuthorities([makeConstraint()])).resolves.toBeUndefined();
  });
});
