import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChromeMock, uninstallChromeMock, type ChromeMockHandle } from '../shared/testing/chrome-mock';
import { buildBlockedSiteRegexFilter } from './rules-builder';
import {
  grantContinuation,
  revokeContinuation,
  handleNavigationComplete,
  handleTabRemoved,
  handleContinuationAlarm,
  isContinuationAlarm,
  tabIdFromContinuationAlarm,
  CONTINUATION_RULE_ID_BASE,
  CONTINUATION_PRIORITY,
} from './continuation-service';

/**
 * IMPORTANT SCOPE NOTE, per the review requirements: these are unit-level
 * approximations against a hand-written mock of `chrome.declarativeNetRequest`
 * / `chrome.alarms` (src/shared/testing/chrome-mock.ts). They prove the
 * *logic* in continuation-service.ts constructs the right rule shape,
 * uses the right priority/tabIds/resourceTypes, is idempotent, and calls
 * the right cleanup APIs at the right times — they do NOT and cannot
 * prove that Chrome's real DNR engine actually lets a request through or
 * re-blocks it afterward, that a real redirect chain behaves as assumed,
 * or that a real service-worker termination/alarm-wake cycle behaves as
 * assumed. Those require the actual unpacked extension (see the QA
 * report accompanying this change).
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

describe('grantContinuation — rule construction', () => {
  it('creates a session rule with priority 3, allow action, tabIds, and MAIN_FRAME only', async () => {
    const result = await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    expect(result.success).toBe(true);

    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5);
    expect(rule).toBeDefined();
    expect(rule!.priority).toBe(CONTINUATION_PRIORITY);
    expect(rule!.priority).toBe(3);
    expect(rule!.action.type).toBe('allow');
    expect(rule!.condition.tabIds).toEqual([5]);
    expect(rule!.condition.resourceTypes).toEqual(['main_frame']);
  });

  it('uses the exact same domain/subdomain matching regex the block rule itself uses', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5);
    expect(rule!.condition.regexFilter).toBe(buildBlockedSiteRegexFilter('facebook.com'));

    const regex = new RegExp(rule!.condition.regexFilter!);
    expect(regex.test('https://facebook.com/')).toBe(true);
    expect(regex.test('https://www.facebook.com/')).toBe(true);
    expect(regex.test('https://web.facebook.com/?_rdc=1&_rdr')).toBe(true);
  });

  it('does NOT cover a redirect to a different second-level domain', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5);
    const regex = new RegExp(rule!.condition.regexFilter!);
    expect(regex.test('https://accounts.example.com/')).toBe(false);
    expect(regex.test('https://not-facebook.com/')).toBe(false);
  });

  it('assigns a deterministic rule ID in the reserved range, one per tab, never colliding with small constraint-rule IDs', async () => {
    await grantContinuation({ domain: 'a.com', tabId: 1 });
    await grantContinuation({ domain: 'b.com', tabId: 2 });
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 1)).toBe(true);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 2)).toBe(true);
    // Nowhere near the 1, 2, 3... range generateRules() assigns to constraints.
    expect(CONTINUATION_RULE_ID_BASE).toBeGreaterThan(10_000);
  });

  it('rejects an invalid domain without creating any rule', async () => {
    const result = await grantContinuation({ domain: 'not a domain', tabId: 5 });
    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });

  it('rejects an invalid tabId without creating any rule', async () => {
    const result = await grantContinuation({ domain: 'facebook.com', tabId: -1 });
    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });
});

describe('grantContinuation — idempotent double-grant (double-click)', () => {
  it('granting twice for the same tab results in exactly one rule, not two', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });

    const rulesForTab = Array.from(mock.sessionRules.values()).filter((r) => r.condition.tabIds?.includes(5));
    expect(rulesForTab).toHaveLength(1);
  });

  it('a second grant for a different tab does not disturb the first tab\'s rule', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await grantContinuation({ domain: 'reddit.com', tabId: 6 });

    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(true);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 6)).toBe(true);
    expect(mock.sessionRules.size).toBe(2);
  });

  it('re-arms the alarm backstop rather than creating a second alarm for the same tab', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const alarmsAfterFirst = mock.alarms.size;
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    expect(mock.alarms.size).toBe(alarmsAfterFirst);
  });
});

describe('cleanup — normal navigation completion', () => {
  it('handleNavigationComplete removes the session rule and the alarm for that tab', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(true);

    await handleNavigationComplete(5);

    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(false);
    expect(mock.alarms.size).toBe(0);
  });

  it('never touches another tab\'s rule (rule IDs are per-tab, so an unrelated tab\'s cleanup call cannot cross-affect it)', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleNavigationComplete(999); // unrelated tab, never granted
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(true);
  });

  it('a second navigation in the same tab after cleanup is no longer covered by any rule', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleNavigationComplete(5); // first ("Continue") navigation resolves
    // Nothing re-grants automatically — a second, unrelated navigation
    // attempt in the same tab has no active session rule to consult.
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(false);
  });

  /**
   * REGRESSION TEST for the real-Chrome bug reported via QA: "after
   * Continue successfully loads facebook.com, refreshing that SAME tab
   * still loads Facebook instead of returning to Checkpoint." Root cause:
   * `handleNavigationComplete` used to gate on `activeGrants.has(tabId)`
   * before revoking — an in-memory-only check that is wiped whenever the
   * MV3 service worker is terminated and restarted (a pending setTimeout
   * does not keep a worker alive, and a fresh worker instance reinitializes
   * this module's `activeGrants` map empty). If that happened between a
   * grant and the tab reaching 'complete', the guard silently skipped the
   * real cleanup even though the session rule — native to Chrome, not tied
   * to worker lifecycle — was still active, leaving it live until the
   * one-minute alarm backstop. This test simulates exactly that: a session
   * rule exists in Chrome's state with no corresponding `activeGrants`
   * entry (as grantContinuation() was never called on this module
   * instance for this tab), and confirms handleNavigationComplete still
   * removes it unconditionally, mirroring handleTabRemoved's existing
   * always-attempt design directly above.
   *
   * SCOPE NOTE: this proves the logic is no longer gated on in-memory
   * state that can go stale. It cannot prove that a real MV3 service
   * worker actually does restart in this window, or that
   * chrome.tabs.onUpdated reliably wakes a terminated worker in real
   * Chrome — only the user's own real-Chrome re-test (Continue, then
   * refresh) can confirm that end-to-end.
   */
  it('unconditionally attempts removal even when in-memory bookkeeping never recorded the grant (e.g. after a service-worker restart) — the fix for the reported refresh-bypass bug', async () => {
    mock.sessionRules.set(CONTINUATION_RULE_ID_BASE + 9, {
      id: CONTINUATION_RULE_ID_BASE + 9,
      priority: 3,
      action: { type: 'allow' },
      condition: { tabIds: [9], resourceTypes: ['main_frame'] },
    });

    await handleNavigationComplete(9);

    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 9)).toBe(false);
  });
});

/**
 * CHARACTERIZATION, not a regression suite for a bug — these tests
 * confirm and pin down a real, disclosed property of the *current*
 * design so it can never silently drift or be forgotten: the grant is
 * scoped to (tabId, domain, MAIN_FRAME) for as long as it's active, not
 * to "the one specific navigation the user clicked Continue for". DNR has
 * no concept of request lineage/causality (confirmed against the current
 * declarativeNetRequest reference — `RuleCondition` has no field for a
 * request ID, a prior request, or redirect-chain membership, and there is
 * no single-use/auto-expiring rule concept at all), so this is not
 * something continuation-service.ts failed to implement — there is no
 * DNR primitive available to implement it with. See
 * BOOMRNG-V2-DESIGN-SPEC.md §30.6 for the full investigation and the
 * accepted-risk rationale.
 */
describe('characterization — grant scope is (tab, domain, time window), not (one navigation)', () => {
  it('Test 1/3: while active, the rule would also match a second, different same-domain URL, not only the one requestContinuation was called for', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5)!;
    const regex = new RegExp(rule.condition.regexFilter!);

    // The specific destination "Continue" was for:
    expect(regex.test('https://www.facebook.com/')).toBe(true);
    // A completely different page on the same domain, e.g. the user
    // manually typing a new address-bar URL, or an unrelated link click,
    // *before* cleanup has run — the rule cannot distinguish this from
    // the intended navigation, because nothing in its condition
    // references the original request at all.
    expect(regex.test('https://www.facebook.com/some/other/totally-unrelated-page')).toBe(true);
    expect(regex.test('https://www.facebook.com/marketplace/')).toBe(true);
  });

  it('Test 2: a rapid refresh of the exact same URL is trivially still covered — refresh is a strict subset of "any same-domain navigation"', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5)!;
    const regex = new RegExp(rule.condition.regexFilter!);
    // A refresh re-requests the identical URL; if Test 1 passes, this
    // passes a fortiori. Asserted separately because it's the scenario
    // most likely to actually happen by accident (a user reflexively
    // hitting refresh) rather than requiring deliberate action.
    expect(regex.test('https://www.facebook.com/')).toBe(true);
  });

  it('Test 4 (contrast case): a genuinely different second-level domain is never covered, confirming the exposure is bounded to one domain, not open-ended', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5)!;
    const regex = new RegExp(rule.condition.regexFilter!);
    expect(regex.test('https://accounts.example.com/')).toBe(false);
    expect(regex.test('https://not-facebook.com/')).toBe(false);
  });

  it('Test 4 (contrast case): a different tab is never covered, confirming tabIds scoping is a hard per-request guarantee, not a timing-dependent one', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5)!;
    // tabIds is an exact-match condition, not something a regex test can
    // accidentally satisfy — a request from tab 6 fails this condition
    // regardless of how well its URL matches regexFilter.
    expect(rule.condition.tabIds).toEqual([5]);
    expect(rule.condition.tabIds).not.toContain(6);
  });

  it('the exposure window closes the moment cleanup runs — before-and-after contrast', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(true); // window open

    await handleNavigationComplete(5);

    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(false); // window closed
    // Once closed, there is nothing left for even the *original* exact
    // destination to match against, let alone an unrelated one.
  });
});

describe('cleanup — tab removal', () => {
  it('removes the rule when the tab closes', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleTabRemoved(5);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(false);
  });

  it('is safe to call for a tab that never had a grant', async () => {
    await expect(handleTabRemoved(42)).resolves.toBeUndefined();
  });

  it('unconditionally attempts removal (robust against lost in-memory bookkeeping, e.g. after a service-worker restart)', async () => {
    // Simulate the rule existing in Chrome's state without this module's
    // own in-memory `activeGrants` map knowing about it (as if the
    // service worker had restarted after granting but before cleanup).
    mock.sessionRules.set(CONTINUATION_RULE_ID_BASE + 7, {
      id: CONTINUATION_RULE_ID_BASE + 7,
      priority: 3,
      action: { type: 'allow' },
      condition: { tabIds: [7], resourceTypes: ['main_frame'] },
    });
    await handleTabRemoved(7);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 7)).toBe(false);
  });
});

describe('cleanup — short in-memory backstop', () => {
  it('revokes the grant if no navigation-complete signal arrives within the short window', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(true);

    await vi.advanceTimersByTimeAsync(15_000);

    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(false);
  });

  it('does not fire if cleanup already happened via the primary signal', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleNavigationComplete(5);
    // Should not throw or misbehave when the backstop timer's callback
    // eventually runs against an already-clean state.
    await vi.advanceTimersByTimeAsync(15_000);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(false);
  });
});

describe('cleanup — alarm backstop', () => {
  it('schedules an alarm scoped to this tab only when granting', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    const alarmNames = Array.from(mock.alarms.keys());
    expect(alarmNames).toHaveLength(1);
    expect(isContinuationAlarm(alarmNames[0])).toBe(true);
    expect(tabIdFromContinuationAlarm(alarmNames[0])).toBe(5);
  });

  it('handleContinuationAlarm removes the rule (the guaranteed long-horizon path)', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleContinuationAlarm(5);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 5)).toBe(false);
  });

  it('isContinuationAlarm/tabIdFromContinuationAlarm do not misidentify an unrelated alarm (e.g. the schedule/progressive-delay rule-refresh timer)', () => {
    expect(isContinuationAlarm('rules-refresh-timer')).toBe(false);
    expect(tabIdFromContinuationAlarm('rules-refresh-timer')).toBeNull();
  });

  it('clearing the alarm on normal cleanup means the backstop never fires for nothing', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleNavigationComplete(5);
    expect(mock.alarms.size).toBe(0);
  });
});

describe('no persistent state — approved architecture decision 6', () => {
  it('granting, cleaning up, and re-granting never writes anything to chrome.storage', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleNavigationComplete(5);
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleTabRemoved(5);

    // The mock's storage area is only ever touched by chrome.storage.local
    // get/set — nothing in this whole flow should have added a key.
    expect(Object.keys(mock.store)).toHaveLength(0);
  });

});

describe('revokeContinuation — idempotent revoke', () => {
  it('is safe to call when nothing is active', async () => {
    await expect(revokeContinuation(123)).resolves.toBeUndefined();
  });

  it('is safe to call twice in a row', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await revokeContinuation(5);
    await expect(revokeContinuation(5)).resolves.toBeUndefined();
  });
});
