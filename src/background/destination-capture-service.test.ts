import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChromeMock, uninstallChromeMock, type ChromeMockHandle } from '../shared/testing/chrome-mock';
import type { Constraint } from '../shared/types/constraint';
import {
  handleBeforeNavigate,
  refreshConstraintCache,
  clearCapturedDestination,
  getCapturedDestination,
} from './destination-capture-service';

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    domain: 'example.com',
    behavior: 'checkpoint',
    delayMinutes: null,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

function storageKey(tabId: number): string {
  return `boomrng_destination_capture_${tabId}`;
}

/** Directly seeds `chrome.storage.session` in the exact shape the module itself writes — same precedent already used in delay-authority-service.test.ts (mock.sessionStore[<exact key>]), rather than a test-only export. */
function seedCapture(tabId: number, url: string, constraintId: string, capturedAt = Date.now()) {
  mock.sessionStore[storageKey(tabId)] = { url, capturedAt, constraintId };
}

let mock: ChromeMockHandle;

// Module-level mutation-chain/cache state persists across tests in this
// file (unlike `mock`, which installChromeMock/uninstallChromeMock does
// reset each time) — tests give each case its own tabId rather than
// resetting shared state, matching the existing precedent in
// continuation-service.test.ts.
beforeEach(() => {
  mock = installChromeMock();
  refreshConstraintCache([]);
});

afterEach(() => {
  uninstallChromeMock();
  vi.useRealTimers();
});

describe('handleBeforeNavigate', () => {
  it('captures a top-frame navigation matching a live constraint', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];
    handleBeforeNavigate({ tabId: 1, frameId: 0, url: 'https://example.com/deep/path?x=1' });
    expect(await getCapturedDestination(1, 'c1')).toBe('https://example.com/deep/path?x=1');
  });

  it('ignores non-top-frame navigations entirely', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];
    handleBeforeNavigate({ tabId: 2, frameId: 1, url: 'https://example.com/iframe' });
    expect(await getCapturedDestination(2, 'c1')).toBeNull();
  });

  it('clears an existing capture when the same tab navigates to an unrelated, unconstrained http(s) page', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];
    handleBeforeNavigate({ tabId: 3, frameId: 0, url: 'https://example.com/deep' });
    expect(await getCapturedDestination(3, 'c1')).toBe('https://example.com/deep');

    handleBeforeNavigate({ tabId: 3, frameId: 0, url: 'https://unrelated.example/' });
    expect(await getCapturedDestination(3, 'c1')).toBeNull();
  });

  it('leaves an existing capture completely untouched when the tab navigates to a non-http(s) target (Boomrng\'s own enforcement page, a refresh, or stale-route reconciliation)', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];
    handleBeforeNavigate({ tabId: 4, frameId: 0, url: 'https://example.com/deep' });

    handleBeforeNavigate({
      tabId: 4,
      frameId: 0,
      url: 'chrome-extension://ext/dist/src/enforcement/checkpoint/index.html?cid=c1&behavior=checkpoint',
    });

    expect(await getCapturedDestination(4, 'c1')).toBe('https://example.com/deep');
  });

  it('a newer qualifying navigation in the same tab overwrites the older capture', async () => {
    refreshConstraintCache([makeConstraint(), makeConstraint({ id: 'c2', domain: 'other.example' })]);
    mock.store.constraints = [makeConstraint(), makeConstraint({ id: 'c2', domain: 'other.example' })];

    handleBeforeNavigate({ tabId: 5, frameId: 0, url: 'https://example.com/first' });
    handleBeforeNavigate({ tabId: 5, frameId: 0, url: 'https://other.example/second' });

    expect(await getCapturedDestination(5, 'c1')).toBeNull(); // overwritten, wrong cid now
    expect(await getCapturedDestination(5, 'c2')).toBe('https://other.example/second');
  });

  it('matches a subdomain of the constraint\'s domain, exactly the DNR/enforcement semantics (one-way, not exact string equality)', async () => {
    refreshConstraintCache([makeConstraint({ domain: 'example.com' })]);
    mock.store.constraints = [makeConstraint({ domain: 'example.com' })];

    handleBeforeNavigate({ tabId: 6, frameId: 0, url: 'https://docs.example.com/some/deep/path' });

    expect(await getCapturedDestination(6, 'c1')).toBe('https://docs.example.com/some/deep/path');
  });

  it('does not capture a cross-domain navigation that shares no relationship with the constraint', async () => {
    refreshConstraintCache([makeConstraint({ domain: 'example.com' })]);
    mock.store.constraints = [makeConstraint({ domain: 'example.com' })];
    handleBeforeNavigate({ tabId: 7, frameId: 0, url: 'https://not-example.com/' });
    expect(await getCapturedDestination(7, 'c1')).toBeNull();
  });

  /**
   * Regression for a confirmed discrepancy between the capture predicate
   * and DNR's own matching: a constraint scoped to a subdomain
   * (`docs.example.com`) must never treat a visit to its own *parent*
   * domain (`example.com`) as constrained — DNR's regex never would.
   */
  it('does NOT capture a visit to the parent domain of a subdomain-scoped constraint', async () => {
    refreshConstraintCache([makeConstraint({ domain: 'docs.example.com' })]);
    mock.store.constraints = [makeConstraint({ domain: 'docs.example.com' })];
    handleBeforeNavigate({ tabId: 8, frameId: 0, url: 'https://example.com/' });
    expect(await getCapturedDestination(8, 'c1')).toBeNull();
  });
});

describe('getCapturedDestination', () => {
  it('returns null when nothing was ever captured for the tab', async () => {
    expect(await getCapturedDestination(101, 'c1')).toBeNull();
  });

  it('returns null on a cid mismatch, even for the exact same tab', async () => {
    seedCapture(102, 'https://example.com/deep', 'c1');
    mock.store.constraints = [makeConstraint()];
    expect(await getCapturedDestination(102, 'wrong-cid')).toBeNull();
  });

  it('returns null once the TTL has elapsed (final backstop)', async () => {
    vi.useFakeTimers();
    seedCapture(103, 'https://example.com/deep', 'c1');
    mock.store.constraints = [makeConstraint()];
    vi.advanceTimersByTime(3 * 60 * 60 * 1000 + 1);
    expect(await getCapturedDestination(103, 'c1')).toBeNull();
  });

  it('returns null once the live constraint has been deleted', async () => {
    seedCapture(104, 'https://example.com/deep', 'c1');
    mock.store.constraints = [];
    expect(await getCapturedDestination(104, 'c1')).toBeNull();
  });

  it('returns null when the live constraint is now Hard Block — Hard Block must never receive a destination', async () => {
    seedCapture(105, 'https://example.com/deep', 'c1');
    mock.store.constraints = [makeConstraint({ behavior: 'hard-block', delayMinutes: null })];
    expect(await getCapturedDestination(105, 'c1')).toBeNull();
  });

  it('returns null when the live constraint\'s own domain has been edited away from the captured URL\'s host', async () => {
    seedCapture(106, 'https://example.com/deep', 'c1');
    mock.store.constraints = [makeConstraint({ domain: 'somewhere-else.example' })];
    expect(await getCapturedDestination(106, 'c1')).toBeNull();
  });

  it('returns the captured destination for a live, matching, non-Hard-Block constraint', async () => {
    seedCapture(107, 'https://example.com/deep/path?x=1', 'c1');
    mock.store.constraints = [makeConstraint()];
    expect(await getCapturedDestination(107, 'c1')).toBe('https://example.com/deep/path?x=1');
  });

  it('honors subdomain-inclusive matching against the live constraint at serve time too, not just at capture time', async () => {
    seedCapture(108, 'https://docs.example.com/deep', 'c1');
    mock.store.constraints = [makeConstraint({ domain: 'example.com' })];
    expect(await getCapturedDestination(108, 'c1')).toBe('https://docs.example.com/deep');
  });

  it('rejects a captured value that is not actually http(s) even if somehow recorded', async () => {
    seedCapture(109, 'javascript:alert(1)', 'c1');
    mock.store.constraints = [makeConstraint()];
    expect(await getCapturedDestination(109, 'c1')).toBeNull();
  });

  it('returns null when a captured parent-domain URL is checked against a live constraint that was edited to a subdomain — the same one-way rule applied at serve time, not just capture time', async () => {
    seedCapture(110, 'https://example.com/deep', 'c1');
    mock.store.constraints = [makeConstraint({ domain: 'docs.example.com' })];
    expect(await getCapturedDestination(110, 'c1')).toBeNull();
  });

  it('survives a simulated service-worker restart — the confirmed real-Chrome Delay regression this chrome.storage.session backing fixes (an in-memory Map would lose this)', async () => {
    seedCapture(111, 'https://example.com/deep/path?x=1', 'c1');
    mock.store.constraints = [makeConstraint()];

    // Simulate an MV3 service-worker restart: a fresh module instance has
    // an empty constraintCache/mutationChains, exactly as a real restart
    // would — `chrome` itself (and its storage.session contents) stays
    // the same global mock, since only the JS module registry resets,
    // not the browser's own storage.
    vi.resetModules();
    const fresh = await import('./destination-capture-service');

    expect(await fresh.getCapturedDestination(111, 'c1')).toBe('https://example.com/deep/path?x=1');
  });
});

describe('refreshConstraintCache', () => {
  it('is what handleBeforeNavigate reads synchronously — a stale cache misses a just-added constraint until refreshed', async () => {
    handleBeforeNavigate({ tabId: 201, frameId: 0, url: 'https://example.com/deep' });
    mock.store.constraints = [makeConstraint()];
    expect(await getCapturedDestination(201, 'c1')).toBeNull(); // cache was empty at capture time

    refreshConstraintCache([makeConstraint()]);
    handleBeforeNavigate({ tabId: 201, frameId: 0, url: 'https://example.com/deep' });
    expect(await getCapturedDestination(201, 'c1')).toBe('https://example.com/deep');
  });
});

describe('clearCapturedDestination', () => {
  it('removes a capture outright (tab-close cleanup)', async () => {
    seedCapture(301, 'https://example.com/deep', 'c1');
    mock.store.constraints = [makeConstraint()];
    clearCapturedDestination(301);
    expect(await getCapturedDestination(301, 'c1')).toBeNull();
  });
});

/**
 * REGRESSION SUITE for the per-tab serialized mutation chain — proves
 * final storage state always reflects the most recently *enqueued*
 * mutation, never whichever underlying `chrome.storage.session` call
 * happens to *settle* first. Uses a deferred/controllable
 * `chrome.storage.session.set`/`remove` to deliberately create the
 * exact out-of-order-completion scenario a naive "track the latest
 * promise" scheme would get wrong.
 */
/** Lets every currently-queued microtask (promise `.then()` chain) drain before continuing — a macrotask boundary is guaranteed to run after them. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('per-tab mutation ordering', () => {
  function installControllableSessionStorage() {
    const pendingSets: Array<{ resolve: () => void; key: string; value: unknown }> = [];
    const pendingRemoves: Array<{ resolve: () => void; key: string }> = [];

    const chromeGlobal = (globalThis as unknown as { chrome: { storage: { session: unknown } } }).chrome;
    const originalSession = chromeGlobal.storage.session as {
      set: (items: Record<string, unknown>) => Promise<void>;
      remove: (key: string) => Promise<void>;
      get: (key: string) => Promise<Record<string, unknown>>;
    };

    chromeGlobal.storage.session = {
      ...originalSession,
      set(items: Record<string, unknown>) {
        const [key, value] = Object.entries(items)[0];
        return new Promise<void>((resolve) => {
          pendingSets.push({
            key,
            value,
            resolve: () => {
              (originalSession as unknown as { set: (i: Record<string, unknown>) => Promise<void> })
                .set({ [key]: value })
                .then(resolve);
            },
          });
        });
      },
      remove(key: string) {
        return new Promise<void>((resolve) => {
          pendingRemoves.push({
            key,
            resolve: () => {
              (originalSession as unknown as { remove: (k: string) => Promise<void> }).remove(key).then(resolve);
            },
          });
        });
      },
      get: originalSession.get,
    };

    return {
      resolveNextSet: () => pendingSets.shift()?.resolve(),
      resolveNextRemove: () => pendingRemoves.shift()?.resolve(),
    };
  }

  it('slow set(A) followed by fast set(B) → final value is B, not whichever settled first', async () => {
    refreshConstraintCache([makeConstraint(), makeConstraint({ id: 'c2', domain: 'other.example' })]);
    mock.store.constraints = [makeConstraint(), makeConstraint({ id: 'c2', domain: 'other.example' })];
    const control = installControllableSessionStorage();

    handleBeforeNavigate({ tabId: 401, frameId: 0, url: 'https://example.com/A' }); // slow — held
    handleBeforeNavigate({ tabId: 401, frameId: 0, url: 'https://other.example/B' }); // fast, but must wait for A

    // handleBeforeNavigate only *enqueues* onto the chain synchronously —
    // the actual chrome.storage.session.set() call for A happens on a
    // later microtask (Promise.resolve().then(...) is never synchronous),
    // and B's set() call is chained *after* A's, so it hasn't even been
    // invoked yet either. Flush once so A's set() call actually reaches
    // the controllable mock before resolving it.
    await flush();
    control.resolveNextSet(); // A's set — the only one actually invoked so far
    await flush(); // lets A's resolution propagate and B's set() call fire
    control.resolveNextSet(); // B's set, which only started after A settled
    await flush();

    expect(await getCapturedDestination(401, 'c1')).toBeNull(); // overwritten
    expect(await getCapturedDestination(401, 'c2')).toBe('https://other.example/B');
  });

  it('slow set(A) followed by clear → final value is absent', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];
    const control = installControllableSessionStorage();

    handleBeforeNavigate({ tabId: 402, frameId: 0, url: 'https://example.com/A' });
    clearCapturedDestination(402);

    await flush();
    control.resolveNextSet();
    await flush();
    control.resolveNextRemove();
    await flush();

    expect(await getCapturedDestination(402, 'c1')).toBeNull();
  });

  it('clear followed by set(B) → final value is B', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];
    const control = installControllableSessionStorage();
    seedCapture(403, 'https://example.com/stale', 'c1');

    clearCapturedDestination(403);
    handleBeforeNavigate({ tabId: 403, frameId: 0, url: 'https://example.com/B' });

    await flush();
    control.resolveNextRemove();
    await flush();
    control.resolveNextSet();
    await flush();

    expect(await getCapturedDestination(403, 'c1')).toBe('https://example.com/B');
  });

  it('a failed mutation does not poison the chain — a subsequent mutation for the same tab still executes', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];

    const chromeGlobal = (globalThis as unknown as { chrome: { storage: { session: unknown } } }).chrome;
    const originalSession = chromeGlobal.storage.session as {
      set: (items: Record<string, unknown>) => Promise<void>;
    };
    let callCount = 0;
    chromeGlobal.storage.session = {
      ...(originalSession as object),
      set(items: Record<string, unknown>) {
        callCount += 1;
        if (callCount === 1) return Promise.reject(new Error('simulated storage failure'));
        return originalSession.set(items);
      },
    };

    handleBeforeNavigate({ tabId: 404, frameId: 0, url: 'https://example.com/first' }); // rejects
    handleBeforeNavigate({ tabId: 404, frameId: 0, url: 'https://example.com/second' }); // must still run

    expect(await getCapturedDestination(404, 'c1')).toBe('https://example.com/second');
  });

  it('mutations in one tab do not block another tab', async () => {
    refreshConstraintCache([makeConstraint()]);
    mock.store.constraints = [makeConstraint()];
    const control = installControllableSessionStorage();

    handleBeforeNavigate({ tabId: 405, frameId: 0, url: 'https://example.com/slow' }); // held — never resolved below
    handleBeforeNavigate({ tabId: 406, frameId: 0, url: 'https://example.com/fast' }); // independent tab

    await flush(); // both tabs' independent chains reach their own set() call — neither depends on the other

    // Resolve only tab 406's set, deliberately leaving tab 405's
    // unresolved for the rest of the test — 406 must not be waiting on
    // 405's chain at all.
    control.resolveNextSet(); // tab 405's set (first enqueued) — left unresolved would hang if 406 depended on it; this resolves whichever is first in FIFO order (405's)
    // If tab 406 were incorrectly serialized behind tab 405, its own
    // set() call would not have fired yet, and getCapturedDestination(406)
    // below would hang waiting on a chain tied to tab 405 instead.
    control.resolveNextSet(); // tab 406's set
    await flush();

    expect(await getCapturedDestination(406, 'c1')).toBe('https://example.com/fast');
  });

  it('an immediate read waits for the entire current chain, not just the first mutation in it', async () => {
    refreshConstraintCache([makeConstraint(), makeConstraint({ id: 'c2', domain: 'other.example' })]);
    mock.store.constraints = [makeConstraint(), makeConstraint({ id: 'c2', domain: 'other.example' })];
    const control = installControllableSessionStorage();

    handleBeforeNavigate({ tabId: 407, frameId: 0, url: 'https://example.com/A' });
    handleBeforeNavigate({ tabId: 407, frameId: 0, url: 'https://other.example/B' });

    // getCapturedDestination reads mutationChains synchronously the
    // moment it's called, before either underlying set() has actually
    // fired — it must still end up waiting for tail B (the *current*
    // tail at the moment of the read), not resolve early against
    // whatever was true before either mutation settled.
    const readPromise = getCapturedDestination(407, 'c2');

    await flush();
    control.resolveNextSet(); // A's set
    await flush();
    control.resolveNextSet(); // B's set, only now invoked

    expect(await readPromise).toBe('https://other.example/B');
  });
});
