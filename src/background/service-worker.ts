import { generateRules } from './rules-builder';
import { loadSettings, loadConstraints } from '../shared/storage/storage-service';
import type { Constraint } from '../shared/types';
import { shouldExcludeTabFromBudget } from '../shared/utils/tabs';
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
} from './continuation-service';
import { clearPinAuthorization, mintPinAuthorization } from './pin-authorization-service';
import { resolveDelayWindow, pruneStaleDelayAuthorities } from './delay-authority-service';

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
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const count = tabs.filter((tab) => !shouldExcludeTabFromBudget(tab)).length;
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

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const countedTabs = tabs.filter((t) => !shouldExcludeTabFromBudget(t)).length;
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

async function updateEnforcementRules(): Promise<void> {
  const settings = await loadSettings();
  const constraints = await loadConstraints();

  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const currentRuleIds = currentRules.map((rule) => rule.id);

  const blockedSites = constraints.map((c) => ({
    url: c.domain,
    behavior: c.behavior,
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

chrome.storage.onChanged.addListener((_changes, namespace) => {
  if (namespace === 'local') {
    refreshEnforcementRules().catch((error) => {
      console.error('[boomrng] Failed to refresh enforcement rules:', error);
    });
    updateBadge().catch((error) => {
      console.error('[boomrng] Failed to update badge:', error);
    });
    // Every constraint edit is exactly the moment a Delay authority can
    // become stale (behavior left `delay`, the constraint was deleted, or
    // it was recreated with a new id) — see pruneStaleDelayAuthorities's
    // own doc comment for the confirmed real-Chrome bug this closes.
    loadConstraints().then(pruneStaleDelayAuthorities).catch((error) => {
      console.error('[boomrng] Failed to prune stale delay authorities:', error);
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
});

chrome.tabs.onRemoved.addListener((tabId) => {
  handleTabRemoved(tabId).catch((error) => {
    console.error('[boomrng] Failed to clean up continuation on tab close:', error);
  });
  updateBadge().catch((error) => {
    console.error('[boomrng] Failed to update badge after tab close:', error);
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

chrome.runtime.onInstalled.addListener(syncStateOnBoot);
chrome.runtime.onStartup.addListener(syncStateOnBoot);

syncStateOnBoot();
