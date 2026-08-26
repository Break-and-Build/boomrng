import { generateRules } from './rules-builder';
import { loadSettings, loadConstraints } from '../shared/storage/storage-service';
import type { Constraint } from '../shared/types';

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
  const count = tabs.length;
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
  if (tabs.length <= maxTabs) return;

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'VALIDATE_PIN') {
    loadSettings().then((settings) => {
      const isValid = settings.pin === message.pin;
      sendResponse({ success: true, data: { valid: isValid } });
    });
    return true;
  }

  if (message.type === 'REQUEST_CONTINUE') {
    sendResponse({ success: true });
    return false;
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
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  await updateBadge();
  const pendingUrl = tab.pendingUrl || tab.url;
  if (!pendingUrl || pendingUrl === 'chrome://newtab/') return;
  await enforceTabLimit(tab, pendingUrl);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await enforceTabLimit(tab, changeInfo.url);
  }
});

chrome.tabs.onRemoved.addListener(() => {
  updateBadge().catch((error) => {
    console.error('[boomrng] Failed to update badge after tab close:', error);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== RULE_TIMER_ALARM) return;
  refreshEnforcementRules().catch((error) => {
    console.error('[boomrng] Failed to refresh rules on timer transition:', error);
  });
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
