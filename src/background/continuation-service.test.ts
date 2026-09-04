import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChromeMock, uninstallChromeMock, type ChromeMockHandle } from '../shared/testing/chrome-mock';
import { buildBlockedSiteRegexFilter } from './rules-builder';
import type { Constraint, ConstraintBehavior } from '../shared/types/constraint';
import {
  grantContinuation,
  revokeContinuation,
  handleNavigationComplete,
  handleTabRemoved,
  handleContinuationAlarm,
  isContinuationAlarm,
  tabIdFromContinuationAlarm,
  invalidateDocumentClearance,
  wasConstraintClearedForTab,
  pruneStaleDocumentClearances,
  CONTINUATION_RULE_ID_BASE,
  CONTINUATION_PRIORITY,
} from './continuation-service';
import { mintPinAuthorization, clearPinAuthorization } from './pin-authorization-service';
import { resolveDelayWindow, pruneStaleDelayAuthorities } from './delay-authority-service';

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

function makeConstraint(domain: string, behavior: ConstraintBehavior, overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: `c-${domain}`,
    domain,
    behavior,
    delayMinutes: behavior === 'delay' ? 15 : null,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

let mock: ChromeMockHandle;

beforeEach(() => {
  vi.useFakeTimers();
  // Every pre-existing test in this file exercises rule
  // construction/cleanup/idempotency mechanics, not authorization — so
  // the domains they already use are seeded here as ordinary, eligible
  // (`checkpoint`) live constraints, once, rather than repeating the
  // same setup in each test. The authorization boundary itself (denying
  // Hard Block, unconstrained domains, ineligible behaviors) is covered
  // by its own dedicated `describe` block below, which seeds its own,
  // deliberately different constraints per case.
  mock = installChromeMock({
    constraints: [
      makeConstraint('facebook.com', 'checkpoint'),
      makeConstraint('a.com', 'checkpoint'),
      makeConstraint('b.com', 'checkpoint'),
      makeConstraint('reddit.com', 'checkpoint'),
    ],
    settings: { pin: null, tabBudget: 10, allowedSites: [], schemaVersion: 1 },
  });
});

afterEach(() => {
  uninstallChromeMock();
  vi.useRealTimers();
});

describe('grantContinuation — rule construction', () => {
  it('creates a session rule with the shared CONTINUATION_PRIORITY, allow action, tabIds, and MAIN_FRAME only', async () => {
    const result = await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    expect(result.success).toBe(true);

    const rule = mock.sessionRules.get(CONTINUATION_RULE_ID_BASE + 5);
    expect(rule).toBeDefined();
    // Sourced from dnr-priority.ts, not a literal here — asserting a
    // specific number would just re-hardcode the exact drift this
    // constant's whole redesign exists to prevent; dnr-priority.test.ts
    // is what proves the actual value stays strictly above every
    // possible redirect/allowed-site priority.
    expect(rule!.priority).toBe(CONTINUATION_PRIORITY);
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
    // Snapshot before: the authorization check (added after the URL-bypass
    // security fix) now legitimately *reads* `constraints`/`settings` via
    // `loadConstraints()`, so the mock's store is no longer empty at rest —
    // this test's actual invariant is that the continuation flow never
    // *writes* a new key, not that the store is empty.
    const keysBefore = Object.keys(mock.store).sort();

    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleNavigationComplete(5);
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await handleTabRemoved(5);

    expect(Object.keys(mock.store).sort()).toEqual(keysBefore);
  });

});

describe('revokeContinuation — idempotent revoke', () => {
  it('is safe to call when nothing is active', async () => {
    // Returns null, not undefined, since Milestone 9's activation-time
    // enforcement fix: the resolved value now reports whether a real
    // grant was consumed (for documentClearance), and there was none.
    await expect(revokeContinuation(123)).resolves.toBeNull();
  });

  it('is safe to call twice in a row', async () => {
    await grantContinuation({ domain: 'facebook.com', tabId: 5 });
    await revokeContinuation(5);
    await expect(revokeContinuation(5)).resolves.toBeNull();
  });
});

/**
 * REGRESSION SUITE for the confirmed real-Chrome URL-bypass security
 * defect: `grantContinuation` used to trust any syntactically valid
 * domain string supplied by the calling page, with no check that a live
 * constraint existed or what its behavior was. Checkpoint's Continue
 * button requires no credential and no timer, so navigating directly to
 * Checkpoint's own extension page with `?domain=<hard-blocked-domain>`
 * obtained a same-tab session `allow` rule (priority 3) that outranked
 * Hard Block's own persistent redirect rule (priority 1) — a full,
 * one-click bypass of a constraint whose entire product promise is that
 * no such bypass exists (§15). These tests pin the fix: the background
 * is the sole authority on whether a grant may be created at all, using
 * live `chrome.storage` constraint state — never the calling page's own
 * UI state, which is trivially reachable directly and unconditionally.
 */
describe('grantContinuation — authorization boundary (security fix)', () => {
  it('SECURITY: denies continuation for a Hard Block constraint — the exact confirmed bypass', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'hard-block')];

    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });

    expect(result.success).toBe(false);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 7)).toBe(false);
  });

  it('SECURITY: denies continuation for a Hard Block constraint even when the request targets a subdomain of it', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'hard-block')];

    const result = await grantContinuation({ domain: 'sub.example.com', tabId: 7 });

    // 'sub.example.com' does not exact-normalize to 'example.com'
    // (see the domain-matching describe block below for why exact
    // matching was chosen), so this denies via "no matching constraint"
    // rather than "matched, but ineligible" — either reason is a safe
    // denial, and the important, tested outcome is that no rule is ever
    // created for a Hard Block-protected domain family.
    expect(result.success).toBe(false);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 7)).toBe(false);
  });

  it('SECURITY: denies continuation for a domain with no live constraint at all (arbitrary/unconstrained domain)', async () => {
    mock.store.constraints = [];

    const result = await grantContinuation({ domain: 'totally-unconstrained.com', tabId: 7 });

    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });

  it('SECURITY: a live constraint for domain A cannot be used to authorize a grant for domain B', async () => {
    mock.store.constraints = [makeConstraint('allowed-checkpoint.com', 'checkpoint')];

    const result = await grantContinuation({ domain: 'not-in-storage-at-all.com', tabId: 7 });

    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });

  it('allows continuation for a live checkpoint constraint', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });
    expect(result.success).toBe(true);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 7)).toBe(true);
  });

  it('allows continuation for a live delay constraint once its authoritative window has elapsed', async () => {
    const constraint = makeConstraint('delay-boundary-1.example', 'delay', { delayMinutes: 1 });
    mock.store.constraints = [constraint];
    // Establishes the real, private authoritative window via the same
    // function GET_DELAY_WINDOW calls, then lets real (faked) time pass
    // it — never seeded via any storage, since none is trusted anymore.
    resolveDelayWindow('delay-boundary-1.example', constraint);
    await vi.advanceTimersByTimeAsync(60_001);
    const result = await grantContinuation({ domain: 'delay-boundary-1.example', tabId: 7 });
    expect(result.success).toBe(true);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 7)).toBe(true);
  });

  it('allows continuation for a live pin-required constraint once a matching PIN authorization was minted', async () => {
    const constraint = makeConstraint('example.com', 'pin-required');
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'example.com', constraint.id);
    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });
    expect(result.success).toBe(true);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 7)).toBe(true);
  });

  it('denies continuation for a legacy/non-V2 behavior not in the explicit eligible set (fail closed on anything not explicitly allow-listed)', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'progressive-delay')];
    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });
    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });

  it('denies continuation when the constraint list is completely empty', async () => {
    mock.store.constraints = [];
    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });
    expect(result.success).toBe(false);
  });
});

/**
 * DOMAIN-MATCHING SEMANTICS, documented explicitly per the review
 * requirement: authorization reuses `findMatchingConstraint()` — the
 * same *exact*-normalized-domain match every enforcement page already
 * uses for its own live-context resolution (`enforcement-context-service.ts`),
 * not a second, differently-scoped domain parser. This is a deliberate
 * choice, not an oversight: tracing `rules-builder.ts`'s own redirect
 * construction shows the `domain=` value an enforcement page ever
 * legitimately receives is always the constraint's own exact stored
 * (normalized) domain — a DNR rule is registered once per constraint
 * and its `regexSubstitution` template always embeds that one fixed
 * value, regardless of which subdomain of it actually matched the
 * request. So exact matching never breaks a real flow, and — unlike the
 * bidirectional subdomain-inclusive `isDomainMatch()` helper, which for
 * two overlapping constraints (e.g. a Hard Block on `sub.example.com`
 * and a separate Checkpoint on `example.com`) could match a request
 * against the *wrong* one of the two depending on array order — exact
 * matching has no such ambiguity. It is the more conservative, fail
 * -closed choice for an authorization boundary specifically.
 */
describe('grantContinuation — domain matching semantics (documented decision)', () => {
  it('a request for a bare domain matches a constraint stored for that exact domain', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });
    expect(result.success).toBe(true);
  });

  it('a request for a subdomain does NOT match a constraint stored for the bare parent domain — exact match only, not the block rule\'s own subdomain-inclusive regex', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    const result = await grantContinuation({ domain: 'sub.example.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('a request for the bare domain does NOT match a constraint stored for a subdomain specifically', async () => {
    mock.store.constraints = [makeConstraint('sub.example.com', 'checkpoint')];
    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('matching is case-insensitive and www-normalized, same as normalizeDomain() everywhere else', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    expect((await grantContinuation({ domain: 'EXAMPLE.COM', tabId: 7 })).success).toBe(true);
    expect((await grantContinuation({ domain: 'www.example.com', tabId: 7 })).success).toBe(true);
  });
});

/**
 * Establishes a real authoritative Delay window via the same function
 * `GET_DELAY_WINDOW` calls (`resolveDelayWindow`, background-managed,
 * `chrome.storage.session`-backed) and, unless `elapse` is false,
 * advances the fake clock past it. Uses a 1-minute constraint duration
 * throughout so "elapsed" only ever needs a single, cheap
 * `advanceTimersByTime` step.
 */
async function establishDelayWindow(domain: string, constraint: Constraint, elapse: boolean): Promise<void> {
  await resolveDelayWindow(domain, constraint);
  if (elapse) {
    vi.advanceTimersByTime((constraint.delayMinutes ?? 1) * 60_000 + 1);
  }
}

/**
 * PREVIOUSLY REPORTED GAP, NOW CLOSED. `grantContinuation` used to
 * authorize a pin-required/delay grant purely by checking the live
 * constraint's *behavior category* — never that the category's own
 * specific precondition (a correct PIN just entered; the configured
 * wait actually elapsed) was satisfied for *this* request. A user with
 * DevTools open on any of this extension's own pages could call
 * `chrome.runtime.sendMessage({type:'REQUEST_CONTINUE', domain:'<pin-or
 * -delay-domain>'})` directly and succeed with neither precondition met.
 *
 * Fixed via two background-owned authorities, re-validated against live
 * constraint data on every read — neither ever accepts a page-supplied
 * timing/elapsed/PIN-result value *through the continuation API itself*:
 * `pin-authorization-service.ts` (pure in-memory, one-shot, tab+domain
 * +constraintId scoped — page-unforgeable, since a service worker's own
 * JS memory has no chrome.storage-style API surface at all) and
 * `delay-authority-service.ts` (`chrome.storage.session`-backed —
 * background-managed, but NOT claimed unforgeable: like every
 * chrome.storage area it is readable and writable by the extension's
 * own pages by default, and a user who deliberately reverse-engineers
 * and hand-writes the internal record via DevTools can force it; see
 * test 16b below, an explicit, accepted threat-model boundary, not an
 * oversight). Checkpoint is unaffected — it never had a precondition
 * beyond "the domain is Checkpoint," which is already fully covered by
 * the behavior-category check above.
 */
describe('grantContinuation — PIN authorization boundary (adversarial)', () => {
  it('1. direct REQUEST_CONTINUE for a live pin-required constraint with no authorization minted → denied', async () => {
    mock.store.constraints = [makeConstraint('instagram.com', 'pin-required')];
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });

  it('2. a wrong PIN attempt (simulated: authorization explicitly cleared, none minted) then REQUEST_CONTINUE → denied', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    clearPinAuthorization(7); // exactly what the VALIDATE_PIN handler does on any attempt, right or wrong
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('3/4. a correct PIN (simulated by minting) → REQUEST_CONTINUE for the same tab/domain/constraint → allowed', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'instagram.com', constraint.id);
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(true);
  });

  it('5. a consumed authorization cannot be reused — a second direct REQUEST_CONTINUE fails without re-verification', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'instagram.com', constraint.id);
    expect((await grantContinuation({ domain: 'instagram.com', tabId: 7 })).success).toBe(true);
    expect((await grantContinuation({ domain: 'instagram.com', tabId: 7 })).success).toBe(false);
  });

  it('6. an authorization minted for domain A cannot unlock domain B', async () => {
    const constraintA = makeConstraint('a.com', 'pin-required');
    const constraintB = makeConstraint('b.com', 'pin-required');
    mock.store.constraints = [constraintA, constraintB];
    mintPinAuthorization(7, 'a.com', constraintA.id);
    const result = await grantContinuation({ domain: 'b.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('7. an authorization minted for tab A cannot unlock tab B', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'instagram.com', constraint.id);
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 8 });
    expect(result.success).toBe(false);
  });

  it('8. a PIN authorization cannot unlock a Delay constraint (different behavior, same domain)', async () => {
    // The domain is pin-required live, but the authorization store is
    // simply never consulted for a delay grant, and no delay window has
    // ever been created — cross-behavior reuse has no code path at all.
    const constraint = makeConstraint('instagram.com', 'delay', { delayMinutes: 15 });
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'instagram.com', constraint.id);
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('9. constraint deleted after PIN success → denied (re-checked live at REQUEST_CONTINUE time)', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'instagram.com', constraint.id);
    mock.store.constraints = []; // deleted before Continue is clicked
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('10. constraint changed to Hard Block after PIN success → denied', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'instagram.com', constraint.id);
    mock.store.constraints = [{ ...constraint, behavior: 'hard-block' }];
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('11. constraint deleted and recreated with a different ID → stale authorization denied', async () => {
    const original = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [original];
    mintPinAuthorization(7, 'instagram.com', original.id);
    const recreated = makeConstraint('instagram.com', 'pin-required', { id: 'a-different-id' });
    mock.store.constraints = [recreated];
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('12. an expired authorization is denied even for the exact right tab/domain/constraint', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    mintPinAuthorization(7, 'instagram.com', constraint.id);
    await vi.advanceTimersByTimeAsync(11_000); // TTL is 10s
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('13. service-worker restart (simulated: the in-memory map is necessarily empty on a fresh module instance) denies a not-yet-consumed authorization — matches handleTabRemoved\'s own documented precedent of failing safe rather than trusting lost bookkeeping', async () => {
    const constraint = makeConstraint('instagram.com', 'pin-required');
    mock.store.constraints = [constraint];
    // No mint call at all — the equivalent of a restart between a real
    // mint and this request, from grantContinuation's point of view:
    // nothing to find, deny.
    const result = await grantContinuation({ domain: 'instagram.com', tabId: 7 });
    expect(result.success).toBe(false);
  });
});

describe('grantContinuation — Delay authorization boundary (adversarial)', () => {
  it('14. direct REQUEST_CONTINUE before any delay window exists → denied (no authoritative window has ever been established)', async () => {
    mock.store.constraints = [makeConstraint('delay-adv-14.example', 'delay', { delayMinutes: 15 })];
    const result = await grantContinuation({ domain: 'delay-adv-14.example', tabId: 7 });
    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });

  it('15. direct REQUEST_CONTINUE before the authoritative endTime → denied', async () => {
    const constraint = makeConstraint('delay-adv-15.example', 'delay', { delayMinutes: 15 });
    mock.store.constraints = [constraint];
    await establishDelayWindow('delay-adv-15.example', constraint, false);
    const result = await grantContinuation({ domain: 'delay-adv-15.example', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('16. a tampered page-owned chrome.storage.local timestamp cannot authorize — that storage is never read by authorization at all now', async () => {
    const constraint = makeConstraint('delay-adv-16.example', 'delay', { delayMinutes: 15 });
    mock.store.constraints = [constraint];
    // The old, page-owned local key from before this authority moved to
    // the background, set to an already-elapsed time — exactly what a
    // DevTools user could still freely write via chrome.storage.local.set().
    // Inert: authorization reads only the background-managed session key
    // (`boomrng_delay_authority_<domain>`), never this one, and no
    // authoritative window was ever established for this domain anyway.
    mock.store['boomrng_delay_ends_delay-adv-16.example'] = { endTime: Date.now() - 1, constraintId: constraint.id, delayMinutes: 15 };
    const result = await grantContinuation({ domain: 'delay-adv-16.example', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('16b. ACCEPTED THREAT-MODEL LIMITATION, documented not disguised: a correctly-keyed, correctly-shaped, already-elapsed chrome.storage.session record IS honored', async () => {
    // This is not a bug. BOOMRNG-V2-DESIGN-SPEC.md §30.8 and
    // delay-authority-service.ts's own doc comment both say plainly:
    // Delay's authoritative record lives in chrome.storage.session so a
    // real, multi-minute wait survives ordinary MV3 service-worker
    // suspension (an in-memory-only design was tried and reverted for
    // exactly this reason — see the design history). The background
    // never trusts anything a page sends *through the continuation API*
    // (no endTime/elapsed/duration/constraintId-as-proof argument to
    // REQUEST_CONTINUE exists), but chrome.storage.session is, like
    // every chrome.storage area, readable *and writable* by the
    // extension's own pages by default — a user who deliberately
    // reverse-engineers Boomrng's internal key format
    // (`boomrng_delay_authority_<domain>`) and record shape
    // (`{endTime, constraintId, delayMinutes}`) and hand-writes a
    // matching, already-elapsed record via DevTools can make the
    // background believe the wait elapsed. This is treated as
    // equivalent in effort/intent to disabling the extension outright,
    // and is explicitly out of scope for Delay specifically — it does
    // NOT weaken Hard Block, PIN, or arbitrary-domain authorization,
    // all of which independently verify their own live prerequisite
    // regardless of what's in chrome.storage (see the Hard Block and
    // PIN describe blocks below and above).
    const constraint = makeConstraint('delay-adv-16b.example', 'delay', { delayMinutes: 15 });
    mock.store.constraints = [constraint];
    mock.sessionStore['boomrng_delay_authority_delay-adv-16b.example'] = { endTime: Date.now() - 1, constraintId: constraint.id, delayMinutes: 15 };
    const result = await grantContinuation({ domain: 'delay-adv-16b.example', tabId: 7 });
    expect(result.success).toBe(true);
  });

  it('17. the authoritative window, once elapsed, allows continuation', async () => {
    const constraint = makeConstraint('delay-adv-17.example', 'delay', { delayMinutes: 1 });
    mock.store.constraints = [constraint];
    await establishDelayWindow('delay-adv-17.example', constraint, true);
    const result = await grantContinuation({ domain: 'delay-adv-17.example', tabId: 7 });
    expect(result.success).toBe(true);
  });

  it('18. an elapsed window belonging to a different constraint ID is denied (wrong owner, same domain)', async () => {
    const original = makeConstraint('delay-adv-18.example', 'delay', { id: 'orig-18', delayMinutes: 1 });
    await establishDelayWindow('delay-adv-18.example', original, true); // elapsed, but owned by 'orig-18'
    const different = makeConstraint('delay-adv-18.example', 'delay', { id: 'different-18', delayMinutes: 15 });
    mock.store.constraints = [different];
    const result = await grantContinuation({ domain: 'delay-adv-18.example', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('19. behavior changed to Hard Block after a window elapsed → denied', async () => {
    const constraint = makeConstraint('delay-adv-19.example', 'delay', { delayMinutes: 1 });
    await establishDelayWindow('delay-adv-19.example', constraint, true);
    mock.store.constraints = [{ ...constraint, behavior: 'hard-block' }];
    const result = await grantContinuation({ domain: 'delay-adv-19.example', tabId: 7 });
    expect(result.success).toBe(false);
  });

  it('20. a recreated constraint (different ID) cannot inherit an old, elapsed window', async () => {
    const old = makeConstraint('delay-adv-20.example', 'delay', { id: 'old-20', delayMinutes: 1 });
    await establishDelayWindow('delay-adv-20.example', old, true);
    const recreated = makeConstraint('delay-adv-20.example', 'delay', { id: 'new-20', delayMinutes: 15 });
    mock.store.constraints = [recreated];
    const result = await grantContinuation({ domain: 'delay-adv-20.example', tabId: 7 });
    expect(result.success).toBe(false); // fresh window for the new constraint has not elapsed
  });

  it('21. accepted duration-snapshot semantics preserved: a same-ID edit to delayMinutes does not mutate an already-active, unelapsed window', async () => {
    const constraint = makeConstraint('delay-adv-21.example', 'delay', { delayMinutes: 1 });
    await establishDelayWindow('delay-adv-21.example', constraint, false); // active, not yet elapsed
    // Live constraint edited to 6 minutes while that window is active — must not shorten or extend it.
    mock.store.constraints = [{ ...constraint, delayMinutes: 6 }];
    const result = await grantContinuation({ domain: 'delay-adv-21.example', tabId: 7 });
    expect(result.success).toBe(false); // the original 1-minute window's own endTime is still in the future
  });

  it('22. refresh/revisit semantics preserved: repeated authorization checks at the same moment agree, and both later agree again once elapsed', async () => {
    const constraint = makeConstraint('delay-adv-22.example', 'delay', { delayMinutes: 1 });
    mock.store.constraints = [constraint];
    // First REQUEST_CONTINUE establishes nothing (deny-only, per #14) —
    // GET_DELAY_WINDOW is what a real page calls first; simulate that here.
    await resolveDelayWindow('delay-adv-22.example', constraint);

    const before1 = await grantContinuation({ domain: 'delay-adv-22.example', tabId: 7 });
    const before2 = await grantContinuation({ domain: 'delay-adv-22.example', tabId: 8 });
    expect(before1.success).toBe(false);
    expect(before2.success).toBe(false); // same window, not independently (mis)computed per tab

    await vi.advanceTimersByTimeAsync(60_001);

    const after1 = await grantContinuation({ domain: 'delay-adv-22.example', tabId: 7 });
    const after2 = await grantContinuation({ domain: 'delay-adv-22.example', tabId: 8 });
    expect(after1.success).toBe(true);
    expect(after2.success).toBe(true);
  });

  it('23. same-domain second-tab semantics: two different tabs consult the identical shared authoritative window', async () => {
    const constraint = makeConstraint('delay-adv-23.example', 'delay', { delayMinutes: 1 });
    mock.store.constraints = [constraint];
    await establishDelayWindow('delay-adv-23.example', constraint, true);
    expect((await grantContinuation({ domain: 'delay-adv-23.example', tabId: 7 })).success).toBe(true);
    expect((await grantContinuation({ domain: 'delay-adv-23.example', tabId: 8 })).success).toBe(true);
  });

  it('24. continuation itself remains tab-scoped even though the delay window is domain-shared — each tab gets its own rule', async () => {
    const constraint = makeConstraint('delay-adv-24.example', 'delay', { delayMinutes: 1 });
    mock.store.constraints = [constraint];
    await establishDelayWindow('delay-adv-24.example', constraint, true);
    await grantContinuation({ domain: 'delay-adv-24.example', tabId: 7 });
    await grantContinuation({ domain: 'delay-adv-24.example', tabId: 8 });
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 7)).toBe(true);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 8)).toBe(true);
  });
});

describe('grantContinuation — Hard Block remains absolute even with stale PIN/Delay authorization present', () => {
  it('26a. a live Hard Block constraint denies continuation even when a PIN authorization for that exact tab/domain exists', async () => {
    const constraint = makeConstraint('example.com', 'hard-block');
    mock.store.constraints = [constraint];
    // Simulates: this domain was pin-required a moment ago, the user
    // verified correctly, then the constraint was switched to Hard
    // Block before Continue was clicked.
    mintPinAuthorization(7, 'example.com', constraint.id);
    const result = await grantContinuation({ domain: 'example.com', tabId: 7 });
    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });

  it('26b. a live Hard Block constraint denies continuation even when an elapsed Delay window for that exact domain/constraint exists', async () => {
    // Establish the window while the constraint is still (legitimately) a
    // delay behavior, elapse it, then flip the same domain/id to Hard Block.
    const delayConstraint = makeConstraint('hardblock-with-delay.example', 'delay', { id: 'hb-1', delayMinutes: 1 });
    await establishDelayWindow('hardblock-with-delay.example', delayConstraint, true);
    mock.store.constraints = [{ ...delayConstraint, behavior: 'hard-block' }];
    const result = await grantContinuation({ domain: 'hardblock-with-delay.example', tabId: 7 });
    expect(result.success).toBe(false);
    expect(mock.sessionRules.size).toBe(0);
  });
});

/**
 * END-TO-END REGRESSION for the confirmed real-Chrome bug: Hard Block
 * edited to Delay · 1 min showed 15 min on first visit, and both a
 * refresh and a second tab restarted the count rather than reusing it.
 * `delay-authority-service.test.ts` covers `pruneStaleDelayAuthorities`
 * in isolation; this exercises the exact user-visible sequence through
 * `grantContinuation` too, so the fix is proven at the layer the actual
 * bug was observed at, not only at the unit under it.
 */
describe('regression — Hard Block edited to Delay reuses no stale authority (confirmed real-Chrome bug)', () => {
  const domain = 'hb-to-delay-e2e.example';
  const id = 'e2e-1';

  it('A. first visit after Hard Block → Delay · 1 min uses the live 1-minute duration, not a stale 15-minute one', async () => {
    // The constraint was Delay · 15 min at some earlier point (establishing
    // a real, unelapsed authority), then edited to Hard Block — modeled by
    // the same constraints-changed reaction service-worker.ts wires up.
    await resolveDelayWindow(domain, makeConstraint(domain, 'delay', { id, delayMinutes: 15 }));
    await pruneStaleDelayAuthorities([makeConstraint(domain, 'hard-block', { id, delayMinutes: null })]);

    // Edited back to Delay · 1 min, same id, saved.
    const constraint = makeConstraint(domain, 'delay', { id, delayMinutes: 1 });
    mock.store.constraints = [constraint];
    await pruneStaleDelayAuthorities([constraint]);

    const window = await resolveDelayWindow(domain, constraint);
    expect(window?.totalMs).toBe(60_000);

    // Not yet elapsed — continuation correctly still denied.
    expect((await grantContinuation({ domain, tabId: 1 })).success).toBe(false);
  });

  it('B. refresh ~20s later does not reset the window', async () => {
    const constraint = makeConstraint(domain, 'delay', { id, delayMinutes: 1 });
    mock.store.constraints = [constraint];
    const first = await resolveDelayWindow(domain, constraint);

    await vi.advanceTimersByTimeAsync(20_000);
    const refreshed = await resolveDelayWindow(domain, constraint);

    expect(refreshed).toEqual(first);
  });

  it('C. a second tab ~20s later sees the exact same remaining window', async () => {
    const constraint = makeConstraint(domain, 'delay', { id, delayMinutes: 1 });
    mock.store.constraints = [constraint];
    const tabA = await resolveDelayWindow(domain, constraint);

    await vi.advanceTimersByTimeAsync(20_000);
    const tabB = await resolveDelayWindow(domain, constraint); // GET_DELAY_WINDOW carries no tab identity into the window at all

    expect(tabB).toEqual(tabA);
  });

  it('D. once genuinely elapsed, Continue succeeds', async () => {
    const constraint = makeConstraint(domain, 'delay', { id, delayMinutes: 1 });
    mock.store.constraints = [constraint];
    await resolveDelayWindow(domain, constraint);

    await vi.advanceTimersByTimeAsync(60_001);

    expect((await grantContinuation({ domain, tabId: 1 })).success).toBe(true);
  });

  it('E. a later, genuinely fresh window (previous one already elapsed and a new visit begins) uses whatever duration is configured then', async () => {
    const constraint = makeConstraint(domain, 'delay', { id, delayMinutes: 1 });
    mock.store.constraints = [constraint];
    await resolveDelayWindow(domain, constraint);
    await vi.advanceTimersByTimeAsync(60_001); // elapses

    // Reconfigured to 5 minutes before the next visit.
    const reconfigured = makeConstraint(domain, 'delay', { id, delayMinutes: 5 });
    mock.store.constraints = [reconfigured];
    await pruneStaleDelayAuthorities([reconfigured]); // still delay, same id — must NOT wipe an unelapsed window, but this one already elapsed so it's moot either way
    const fresh = await resolveDelayWindow(domain, reconfigured);
    expect(fresh?.totalMs).toBe(5 * 60_000);
  });

  it('F. active Delay · 15 edited mid-wait to 1 min: the active window stays 15; the NEXT fresh window (after it elapses) uses 1', async () => {
    const constraint = makeConstraint(domain, 'delay', { id, delayMinutes: 15 });
    mock.store.constraints = [constraint];
    const active = await resolveDelayWindow(domain, constraint); // active, counting down, behavior never left 'delay'

    const edited = makeConstraint(domain, 'delay', { id, delayMinutes: 1 });
    mock.store.constraints = [edited];
    await pruneStaleDelayAuthorities([edited]); // must be a no-op — legitimate Option A, not the bug

    const stillActive = await resolveDelayWindow(domain, edited);
    expect(stillActive).toEqual(active);
    expect(stillActive?.totalMs).toBe(15 * 60_000); // unchanged by the edit

    await vi.advanceTimersByTimeAsync(15 * 60_000 + 1); // the ORIGINAL 15-minute window elapses
    const nextFreshWindow = await resolveDelayWindow(domain, edited);
    expect(nextFreshWindow?.totalMs).toBe(60_000); // the next window honors the now-live 1-minute duration
  });

  it('G. Delay → Hard Block during an active, unelapsed window denies continuation immediately', async () => {
    const constraint = makeConstraint(domain, 'delay', { id, delayMinutes: 15 });
    mock.store.constraints = [constraint];
    await resolveDelayWindow(domain, constraint); // active, not yet elapsed

    const hardBlocked = makeConstraint(domain, 'hard-block', { id, delayMinutes: null });
    mock.store.constraints = [hardBlocked];
    await pruneStaleDelayAuthorities([hardBlocked]);

    expect((await grantContinuation({ domain, tabId: 1 })).success).toBe(false);
  });

  it('H. PIN and Hard Block boundaries are unaffected by this fix', async () => {
    const pinDomain = 'e2e-pin.example';
    const pinConstraint = makeConstraint(pinDomain, 'pin-required');
    mock.store.constraints = [pinConstraint];
    // Direct REQUEST_CONTINUE with no PIN verification still denied.
    expect((await grantContinuation({ domain: pinDomain, tabId: 1 })).success).toBe(false);
    mintPinAuthorization(1, pinDomain, pinConstraint.id);
    expect((await grantContinuation({ domain: pinDomain, tabId: 1 })).success).toBe(true);

    const hbDomain = 'e2e-hardblock.example';
    mock.store.constraints = [makeConstraint(hbDomain, 'hard-block')];
    expect((await grantContinuation({ domain: hbDomain, tabId: 1 })).success).toBe(false);
  });
});

/**
 * `documentClearance` — the state machine `tab-enforcement-service.ts`'s
 * activation check relies on to avoid re-blocking a tab on every
 * tab-switch after a real Continue, without granting anything broader
 * than the existing per-navigation continuation model already does.
 * Locked invariants (BOOMRNG-V2-DESIGN-SPEC.md tab-activation
 * investigation, architecture-review follow-up):
 *
 * 1. A successful `grantContinuation()` records `{constraintId, behavior}`
 *    on the active grant.
 * 2. `invalidateDocumentClearance` (called from `service-worker.ts` on
 *    `chrome.tabs.onUpdated`'s `status:'loading'`) clears any previous
 *    clearance for that tab.
 * 3. `revokeContinuation` still unconditionally removes the DNR
 *    continuation rule regardless of what it finds — this must never be
 *    weakened merely to obtain the metadata in point 4.
 * 4. `handleNavigationComplete` establishes a fresh clearance only when
 *    the completion actually consumed a real, recorded `activeGrants`
 *    entry.
 * 5. An unrelated completion — including one after a simulated
 *    worker-restart where `activeGrants` was lost — must never
 *    manufacture a clearance.
 */
describe('documentClearance — activation-time enforcement state machine', () => {
  // Every test below uses its own, never-reused tabId — `documentClearance`
  // is module-level state that persists across tests in this file (unlike
  // `mock`, which `installChromeMock`/`uninstallChromeMock` do reset each
  // time), so a shared tabId would let one test's clearance leak into the
  // next and mask exactly the invariants being locked down here.

  it('1+4. a successful grant, once its navigation completes, establishes clearance for that exact constraint id and behavior', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    const granted = await grantContinuation({ domain: 'example.com', tabId: 101 });
    expect(granted.success).toBe(true);

    await handleNavigationComplete(101);

    expect(wasConstraintClearedForTab(101, 'c-example.com', 'checkpoint')).toBe(true);
  });

  it('5. a completion with no active grant does not establish clearance', async () => {
    // No grantContinuation call at all for this tab.
    await handleNavigationComplete(102);

    expect(wasConstraintClearedForTab(102, 'c-example.com', 'checkpoint')).toBe(false);
  });

  /**
   * `handleNavigationComplete`'s return value — purely additive metadata,
   * widened for `service-worker.ts` to know exactly when a captured
   * original-destination record (destination-capture-service.ts) has
   * served its purpose and should stop being retained. A non-null result
   * here is precisely the "the bridge from enforcement page back to the
   * original destination was just used for real" signal; a null result
   * (nothing was actually consumed) must never be mistaken for that.
   */
  it('returns the consumed grant\'s {constraintId, behavior} when a real grant was consumed by this completion', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    await grantContinuation({ domain: 'example.com', tabId: 110 });

    const result = await handleNavigationComplete(110);

    expect(result).toEqual({ constraintId: 'c-example.com', behavior: 'checkpoint' });
  });

  it('returns null when no grant was active for this completion — never a false "just consumed" signal', async () => {
    const result = await handleNavigationComplete(111);
    expect(result).toBeNull();
  });

  it('3+5. worker-restart simulation: the DNR rule is still unconditionally removed, but no clearance is manufactured for a grant this instance never saw', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    const granted = await grantContinuation({ domain: 'example.com', tabId: 103 });
    expect(granted.success).toBe(true);
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 103)).toBe(true);

    // Simulate an MV3 service-worker restart: a fresh module instance has
    // an empty `activeGrants`/`documentClearance`, exactly as a real
    // restart would — `chrome` itself stays the same global mock, since
    // only the JS module registry is reset, not the browser.
    vi.resetModules();
    const fresh = await import('./continuation-service');

    const revokeResult = await fresh.revokeContinuation(103);

    // Point 3: cleanup is unconditional regardless of the lost bookkeeping.
    expect(mock.sessionRules.has(CONTINUATION_RULE_ID_BASE + 103)).toBe(false);
    // Point 5: nothing to report, because this instance never saw the grant.
    expect(revokeResult).toBeNull();
    expect(fresh.wasConstraintClearedForTab(103, 'c-example.com', 'checkpoint')).toBe(false);
  });

  it('2. \'loading\' invalidates a previously-established clearance', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    await grantContinuation({ domain: 'example.com', tabId: 104 });
    await handleNavigationComplete(104);
    expect(wasConstraintClearedForTab(104, 'c-example.com', 'checkpoint')).toBe(true);

    invalidateDocumentClearance(104);

    expect(wasConstraintClearedForTab(104, 'c-example.com', 'checkpoint')).toBe(false);
  });

  it('constraint id match with a behavior mismatch does not inherit clearance (an id survives a behavior edit; a Checkpoint clearance must not exempt the same constraint once it becomes Delay)', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    await grantContinuation({ domain: 'example.com', tabId: 105 });
    await handleNavigationComplete(105);
    expect(wasConstraintClearedForTab(105, 'c-example.com', 'checkpoint')).toBe(true);

    // Same id, edited to a different behavior — the exact-match query
    // must reject it, even though the id alone still matches.
    expect(wasConstraintClearedForTab(105, 'c-example.com', 'delay')).toBe(false);
  });

  it('a deleted constraint prunes its tab’s clearance', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    await grantContinuation({ domain: 'example.com', tabId: 106 });
    await handleNavigationComplete(106);
    expect(wasConstraintClearedForTab(106, 'c-example.com', 'checkpoint')).toBe(true);

    pruneStaleDocumentClearances([]); // constraint no longer exists at all

    expect(wasConstraintClearedForTab(106, 'c-example.com', 'checkpoint')).toBe(false);
  });

  it('a constraint edited to a different behavior prunes its tab’s clearance (same id, same reasoning as pruneStaleDelayAuthorities)', async () => {
    const constraint = makeConstraint('example.com', 'checkpoint');
    mock.store.constraints = [constraint];
    await grantContinuation({ domain: 'example.com', tabId: 107 });
    await handleNavigationComplete(107);
    expect(wasConstraintClearedForTab(107, constraint.id, 'checkpoint')).toBe(true);

    const edited = { ...constraint, behavior: 'hard-block' as const };
    pruneStaleDocumentClearances([edited]);

    expect(wasConstraintClearedForTab(107, constraint.id, 'checkpoint')).toBe(false);
  });

  it('an unedited, still-live constraint is left alone by pruning', async () => {
    const constraint = makeConstraint('example.com', 'checkpoint');
    mock.store.constraints = [constraint];
    await grantContinuation({ domain: 'example.com', tabId: 108 });
    await handleNavigationComplete(108);

    pruneStaleDocumentClearances([constraint]); // unchanged — must be a no-op

    expect(wasConstraintClearedForTab(108, constraint.id, 'checkpoint')).toBe(true);
  });

  it('a grant that only ever times out via the alarm/short backstop (never reaches handleNavigationComplete) never establishes clearance', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    await grantContinuation({ domain: 'example.com', tabId: 109 });

    // The backstop path — handleContinuationAlarm — also calls
    // revokeContinuation, but (unlike handleNavigationComplete) never
    // inspects its return value to establish clearance.
    await handleContinuationAlarm(109);

    expect(wasConstraintClearedForTab(109, 'c-example.com', 'checkpoint')).toBe(false);
  });

  it('closing the tab drops its clearance', async () => {
    mock.store.constraints = [makeConstraint('example.com', 'checkpoint')];
    await grantContinuation({ domain: 'example.com', tabId: 110 });
    await handleNavigationComplete(110);
    expect(wasConstraintClearedForTab(110, 'c-example.com', 'checkpoint')).toBe(true);

    await handleTabRemoved(110);

    expect(wasConstraintClearedForTab(110, 'c-example.com', 'checkpoint')).toBe(false);
  });
});
