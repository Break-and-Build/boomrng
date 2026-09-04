import { generateRules } from './rules-builder';
import { loadSettings, loadConstraints } from '../shared/storage/storage-service';
import type { Constraint, Settings } from '../shared/types';
import { queryEligibleNormalTabs } from '../shared/utils/tabs';
import { verifyPin } from '../shared/services/pin-service';
import { findMatchingConstraint } from '../shared/services/enforcement-context-service';
import { normalizeDomain } from '../shared/utils/domain';
import {
  grantContinuation,
  handleNavigationComplete,
  handleTabRemoved,
  handleContinuationAlarm,
  isContinuationAlarm,
  tabIdFromContinuationAlarm,
  invalidateDocumentClearance,
  pruneStaleDocumentClearances,
} from './continuation-service';
import { clearPinAuthorization, mintPinAuthorization } from './pin-authorization-service';
import { resolveDelayWindow, pruneStaleDelayAuthorities } from './delay-authority-service';
import { checkAndEnforceTab } from './tab-enforcement-service';
import { removeV1LegacyStorage } from './legacy-cleanup';

let ruleRefreshInFlight: Promise<void> | null = null;
let ruleRefreshQueued = false;
const RULE_TIMER_ALARM = 'rules-refresh-timer';

function getExtensionId(): string {
  return chrome.runtime.id;
}

function isEnforcementPageUrl(url: string | undefined): boolean {
  if (typeof url !== 'string') return false;
  return url.includes('enforcement/') && url.includes('index.html');
}

function computeNextTimerTransition(constraints: Constraint[], nowMs: number = Date.now()): number | null {
  let nextAt: number | null = null;

  for (const constraint of constraints) {
    if (constraint.behavior === 'scheduled' && constraint.schedule) {
      const schedule = constraint.schedule;
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (schedule.days.includes(currentDay)) {
        if (currentTime < schedule.from) {
          const [h, m] = schedule.from.split(':').map(Number);
          const todayAt = new Date(now);
          todayAt.setHours(h, m, 0, 0);
          nextAt = nextAt === null ? todayAt.getTime() : Math.min(nextAt, todayAt.getTime());
        } else if (currentTime > schedule.to) {
          const [h, m] = schedule.to.split(':').map(Number);
          const todayAt = new Date(now);
          todayAt.setHours(h, m, 0, 0);
          nextAt = nextAt === null ? todayAt.getTime() : Math.min(nextAt, todayAt.getTime());
        }
      }
    }

    if (constraint.progressiveDelay?.expiresAt) {
      const expiresAt = constraint.progressiveDelay.expiresAt;
      if (expiresAt > nowMs) {
        nextAt = nextAt === null ? expiresAt : Math.min(nextAt, expiresAt);
      }
    }
  }

  return nextAt;
}

async function scheduleNextTimerRefresh(constraints: Constraint[]): Promise<void> {
  await chrome.alarms.clear(RULE_TIMER_ALARM);
  const nextAt = computeNextTimerTransition(constraints);
  if (!nextAt) return;
  chrome.alarms.create(RULE_TIMER_ALARM, { when: nextAt + 500 });
}

async function updateBadge(): Promise<void> {
  const settings = await loadSettings();
  const count = (await queryEligibleNormalTabs()).length;
  const max = settings.tabBudget;

  chrome.action.setBadgeText({ text: count.toString() });

  if (max > 0) {
    if (count > max) {
      chrome.action.setBadgeBackgroundColor({ color: '#D32F2F' });
    } else if (count === max) {
      chrome.action.setBadgeBackgroundColor({ color: '#F57C00' });
    } else {
      chrome.action.setBadgeBackgroundColor({ color: '#388E3C' });
    }
  } else {
    chrome.action.setBadgeBackgroundColor({ color: '#1976D2' });
  }
}

async function enforceTabLimit(tab: chrome.tabs.Tab, attemptedUrl?: string): Promise<void> {
  const settings = await loadSettings();
  const maxTabs = settings.tabBudget;
  if (maxTabs <= 0) return;

  const countedTabs = (await queryEligibleNormalTabs()).length;
  if (countedTabs <= maxTabs) return;

  if (isEnforcementPageUrl(tab.url) || isEnforcementPageUrl(attemptedUrl)) return;

  const extensionId = getExtensionId();
  const limitPageUrl = new URL(`chrome-extension://${extensionId}/dist/src/enforcement/tabbudget/index.html`);
  const pendingUrl = attemptedUrl || tab.url;
  if (pendingUrl) {
    limitPageUrl.searchParams.set('pending', pendingUrl);
  }
  if (tab.id) {
    chrome.tabs.update(tab.id, { url: limitPageUrl.toString() });
  }
}

/**
 * Picks the one existing tab to redirect when a lowered Tab Budget
 * immediately puts the current global count over the new limit — the
 * user hasn't created or navigated any tab, so there's no natural
 * "triggering tab" the way `enforceTabLimit`'s other callers have one.
 * Prefers the active tab of the last-focused normal window (the tab the
 * user is actually looking at); falls back to the eligible tab with the
 * lowest `id` — the same global-monotonic-id proxy for "oldest"
 * `tabbudget-view.ts`'s `getOldestTabs()` already uses for the recovery
 * page's own "close oldest" — kept as a small local computation here
 * rather than importing that module, since the background only ever
 * needs a single deterministic tab, not the recovery page's full sorted
 * list/row-building behavior.
 */
async function selectTabForImmediateEnforcement(eligibleTabs: chrome.tabs.Tab[]): Promise<chrome.tabs.Tab | null> {
  try {
    const focused = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    const activeInFocused = eligibleTabs.find((t) => t.windowId === focused.id && t.active);
    if (activeInFocused) return activeInFocused;
  } catch {
    // No normal window currently focused — fall through to the deterministic fallback.
  }

  let oldest: chrome.tabs.Tab | null = null;
  for (const t of eligibleTabs) {
    if (t.id === undefined) continue;
    if (oldest === null || (oldest.id !== undefined && t.id < oldest.id)) oldest = t;
  }
  return oldest;
}

/**
 * Called only when `chrome.storage.onChanged` reports `settings.tabBudget`
 * actually changed (see the listener below) — the product contract this
 * closes: lowering the budget must enter enforcement immediately, without
 * waiting for the next tab creation/navigation to happen to trip
 * `enforceTabLimit`'s own check. Reuses `enforceTabLimit` unconditionally
 * rather than duplicating its redirect/pending-URL/enforcement-page-guard
 * logic — this only supplies the one thing a settings change doesn't
 * naturally have: which tab to treat as "the" tab to redirect.
 *
 * `maxTabs <= 0` (disabled/no limit) intentionally never reaches
 * selection at all — matches `enforceTabLimit`'s own early return for the
 * same threshold, and covers "changed to 0" needing no enforcement.
 * Raising the budget (or disabling it) while a Tab Budget page is already
 * open is handled separately, on that page's own side (it now also
 * listens for `chrome.storage.onChanged` and re-checks whether it should
 * resume) — this function only ever enters enforcement, never releases it.
 */
async function reconcileTabBudgetOnSettingsChange(): Promise<void> {
  const settings = await loadSettings();
  if (settings.tabBudget <= 0) return;

  const eligibleTabs = await queryEligibleNormalTabs();
  if (eligibleTabs.length <= settings.tabBudget) return;

  const selected = await selectTabForImmediateEnforcement(eligibleTabs);
  if (!selected) return;

  await enforceTabLimit(selected);
}

async function updateEnforcementRules(): Promise<void> {
  const settings = await loadSettings();
  const constraints = await loadConstraints();

  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const currentRuleIds = currentRules.map((rule) => rule.id);

  const blockedSites = constraints.map((c) => ({
    url: c.domain,
    behavior: c.behavior,
    id: c.id,
  }));

  const extensionId = getExtensionId();
  const newRules = generateRules(blockedSites, settings.allowedSites, extensionId);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: currentRuleIds,
    addRules: newRules,
  });

  await scheduleNextTimerRefresh(constraints);
}

async function refreshEnforcementRules(): Promise<void> {
  if (ruleRefreshInFlight) {
    ruleRefreshQueued = true;
    return ruleRefreshInFlight;
  }

  ruleRefreshInFlight = (async () => {
    do {
      ruleRefreshQueued = false;
      await updateEnforcementRules();
    } while (ruleRefreshQueued);
  })();

  try {
    await ruleRefreshInFlight;
  } finally {
    ruleRefreshInFlight = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VALIDATE_PIN') {
    // The tab is read from `sender`, never the message body — same rule
    // as REQUEST_CONTINUE below. A PIN authorization is minted (or
    // withheld) for *this* tab only.
    const tabId = sender.tab?.id;
    if (tabId !== undefined) {
      // Any fresh attempt — right or wrong, eligible domain or not —
      // invalidates whatever authorization was already pending for this
      // tab (BOOMRNG-V2-DESIGN-SPEC.md security fix: a wrong PIN must
      // never leave an earlier success's authorization usable).
      clearPinAuthorization(tabId);
    }

    const host = normalizeDomain(message.domain);

    Promise.all([loadConstraints(), loadSettings()]).then(([constraints, settings]) => {
      const constraint = host ? findMatchingConstraint(host, constraints) : null;

      // Fail closed before ever comparing the candidate: a domain that
      // isn't a live pin-required constraint right now has nothing
      // legitimate a PIN check could authorize, and must not be usable
      // as an oracle for "is this the device's PIN" against arbitrary
      // domains (unconstrained, checkpoint, delay, or hard-block).
      if (tabId === undefined || !host || !constraint || constraint.behavior !== 'pin-required') {
        sendResponse({ success: true, data: { valid: false } });
        return;
      }

      const isValid = verifyPin(message.pin, settings.pin);
      if (isValid) {
        mintPinAuthorization(tabId, host, constraint.id);
      }
      sendResponse({ success: true, data: { valid: isValid } });
    });
    return true;
  }

  if (message.type === 'GET_DELAY_WINDOW') {
    const host = normalizeDomain(message.domain);
    if (!host) {
      sendResponse({ success: false, error: 'Invalid domain' });
      return false;
    }
    loadConstraints().then(async (constraints) => {
      const constraint = findMatchingConstraint(host, constraints);
      const window = await resolveDelayWindow(host, constraint);
      if (!window) {
        sendResponse({ success: false, error: 'No active delay constraint for this domain' });
        return;
      }
      sendResponse({ success: true, data: window });
    });
    return true;
  }

  if (message.type === 'REQUEST_CONTINUE') {
    // The tab is read from `sender`, never trusted from the message body
    // — a page can only ever request continuation for the tab it's
    // actually running in, not an arbitrary tabId it might claim.
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      sendResponse({ success: false, error: 'No tab context for this request' });
      return false;
    }
    grantContinuation({ domain: message.domain, tabId }).then(sendResponse);
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    refreshEnforcementRules().catch((error) => {
      console.error('[boomrng] Failed to refresh enforcement rules:', error);
    });
    updateBadge().catch((error) => {
      console.error('[boomrng] Failed to update badge:', error);
    });
    // Narrowly scoped to an actual `tabBudget` change — unlike the two
    // calls above (cheap, side-effect-free, fine to run on every local
    // write), this can redirect an open tab, so it only fires when the
    // one setting it cares about actually changed.
    const settingsChange = changes.settings;
    const oldBudget = (settingsChange?.oldValue as Settings | undefined)?.tabBudget;
    const newBudget = (settingsChange?.newValue as Settings | undefined)?.tabBudget;
    if (newBudget !== undefined && newBudget !== oldBudget) {
      reconcileTabBudgetOnSettingsChange().catch((error) => {
        console.error('[boomrng] Failed to reconcile tab budget on settings change:', error);
      });
    }
    // Every constraint edit is exactly the moment a Delay authority can
    // become stale (behavior left `delay`, the constraint was deleted, or
    // it was recreated with a new id) — see pruneStaleDelayAuthorities's
    // own doc comment for the confirmed real-Chrome bug this closes.
    loadConstraints().then(pruneStaleDelayAuthorities).catch((error) => {
      console.error('[boomrng] Failed to prune stale delay authorities:', error);
    });
    // Same reasoning, for activation-time enforcement clearance: an edit
    // that deletes a constraint or changes its behavior must not leave a
    // tab wrongly exempt from what that constraint now requires.
    loadConstraints().then(pruneStaleDocumentClearances).catch((error) => {
      console.error('[boomrng] Failed to prune stale document clearances:', error);
    });
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  await updateBadge();
  const pendingUrl = tab.pendingUrl || tab.url;
  if (!pendingUrl || pendingUrl === 'chrome://newtab/') return;
  await enforceTabLimit(tab, pendingUrl);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Each concern is isolated with its own .catch() — matching every other
  // listener in this file — so a failure in one can never silently
  // prevent the other from running for this event. Previously both were
  // awaited sequentially inside one async function with no isolation: an
  // enforceTabLimit() rejection would have skipped handleNavigationComplete()
  // entirely for that event, on top of leaving an unhandled rejection.
  if (changeInfo.url) {
    enforceTabLimit(tab, changeInfo.url).catch((error) => {
      console.error('[boomrng] Failed to enforce tab limit:', error);
    });
  }
  // Primary continuation cleanup signal. Deliberately gated on the whole
  // navigation reaching 'complete' — not the first onUpdated event after
  // a grant, which can fire mid-redirect-chain — so a same-domain server
  // redirect (facebook.com -> web.facebook.com) always gets the chance to
  // finish under the grant before it's revoked (see continuation-service.ts).
  if (changeInfo.status === 'complete') {
    handleNavigationComplete(tabId).catch((error) => {
      console.error('[boomrng] Failed to clean up continuation on navigation complete:', error);
    });
  }
  // 'loading' — not any url change — is the signal a genuine new
  // top-level navigation is starting: `history.pushState`/`replaceState`
  // and a bfcache-served back/forward restore both update `tab.url`
  // without ever transitioning through 'loading', so neither one
  // invalidates activation-time enforcement clearance (continuation-
  // service.ts's `documentClearance`) — matching that DNR itself was
  // never involved in either case either, today or with this listener.
  if (changeInfo.status === 'loading') {
    invalidateDocumentClearance(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  handleTabRemoved(tabId).catch((error) => {
    console.error('[boomrng] Failed to clean up continuation on tab close:', error);
  });
  updateBadge().catch((error) => {
    console.error('[boomrng] Failed to update badge after tab close:', error);
  });
});

// Activation-time enforcement (Milestone 9 gap fix): DNR only evaluates a
// *new* navigation request, so a tab that was already open and settled on
// a domain before a matching constraint existed — or before it changed to
// one — stays fully usable until switched to. Deliberately reactive only:
// nothing here proactively reloads a tab the user isn't looking at; see
// `tab-enforcement-service.ts` for the actual decision (and why a reload,
// not a hand-built enforcement URL, is the only action taken).
chrome.tabs.onActivated.addListener(({ tabId }) => {
  checkAndEnforceTab(tabId).catch((error) => {
    console.error('[boomrng] Failed to check tab for activation-time enforcement:', error);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RULE_TIMER_ALARM) {
    refreshEnforcementRules().catch((error) => {
      console.error('[boomrng] Failed to refresh rules on timer transition:', error);
    });
    return;
  }

  if (isContinuationAlarm(alarm.name)) {
    const tabId = tabIdFromContinuationAlarm(alarm.name);
    if (tabId !== null) {
      handleContinuationAlarm(tabId).catch((error) => {
        console.error('[boomrng] Failed to revoke continuation (alarm backstop):', error);
      });
    }
  }
});

function syncStateOnBoot(): void {
  refreshEnforcementRules().catch((error) => {
    console.error('[boomrng] Failed to initialize enforcement rules:', error);
  });
  updateBadge().catch((error) => {
    console.error('[boomrng] Failed to initialize badge:', error);
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  // V1 legacy storage hygiene, not a migration — see legacy-cleanup.ts.
  // Not awaited: this and syncStateOnBoot() below are dispatched
  // concurrently, not sequentially, which is safe only because they
  // touch entirely disjoint storage keys.
  if (details.reason === 'update') {
    removeV1LegacyStorage().catch((error) => {
      console.error('[boomrng] Failed to remove legacy V1 storage keys:', error);
    });
  }
  syncStateOnBoot();
});
chrome.runtime.onStartup.addListener(syncStateOnBoot);

syncStateOnBoot();
