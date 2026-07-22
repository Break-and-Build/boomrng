import { generateRules } from './rulesBuilder.js';

function isFeatureEnabled(data) {
    return data.enabled !== false;
}

function isLimitPageUrl(url) {
    return typeof url === 'string' && url.includes('limit.html');
}

let ruleRefreshInFlight = null;
let ruleRefreshQueued = false;
const RULE_TIMER_ALARM = 'rules-refresh-timer';

function computeNextTimerTransition(blockedSites, nowMs = Date.now()) {
    let nextAt = null;

    (blockedSites || []).forEach((site) => {
        if (!site || typeof site !== 'object') return;

        const lockUntil = Number(site.lockUntil);
        if (Number.isFinite(lockUntil) && lockUntil > nowMs) {
            nextAt = nextAt === null ? lockUntil : Math.min(nextAt, lockUntil);
        }

        const bypassUntil = Number(site.bypassUntil);
        if (Number.isFinite(bypassUntil) && bypassUntil > nowMs) {
            nextAt = nextAt === null ? bypassUntil : Math.min(nextAt, bypassUntil);
        }
    });

    return nextAt;
}

async function scheduleNextTimerRefresh(blockedSites) {
    await chrome.alarms.clear(RULE_TIMER_ALARM);

    const nextAt = computeNextTimerTransition(blockedSites);
    if (!nextAt) return;

    chrome.alarms.create(RULE_TIMER_ALARM, { when: nextAt + 500 });
}

async function updateBadge() {
    const data = await chrome.storage.local.get(['maxTabs', 'enabled']);
    const isEnabled = isFeatureEnabled(data);

    if (!isEnabled) {
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "#6e6e6e" });
        return;
    }

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const count = tabs.length;
    const max = Number.parseInt(data.maxTabs, 10) || 0;

    chrome.action.setBadgeText({ text: count.toString() });

    if (max > 0) {
        if (count > max) { // Strictly greater than (Violating)
            chrome.action.setBadgeBackgroundColor({ color: "#D32F2F" }); // Red
        } else if (count === max) { // At the limit
            chrome.action.setBadgeBackgroundColor({ color: "#F57C00" }); // Orange
        } else {
            chrome.action.setBadgeBackgroundColor({ color: "#388E3C" }); // Green
        }
    } else {
        chrome.action.setBadgeBackgroundColor({ color: "#1976D2" });
    }
}

// --- HELPER: The Enforcer (Shared Logic) ---
async function enforceTabLimit(tab, attemptedUrl = null) {
    const data = await chrome.storage.local.get(['maxTabs', 'enabled']);
    if (!isFeatureEnabled(data) || !data.maxTabs) return;

    const maxTabs = Number.parseInt(data.maxTabs, 10);
    if (!Number.isFinite(maxTabs) || maxTabs <= 0) return;
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // If we are OVER the limit
    if (tabs.length > maxTabs) {
        // 1. Check if we are already on the limit page (Prevent infinite loops)
        if (isLimitPageUrl(tab.url) || isLimitPageUrl(attemptedUrl)) return;

        // 2. Redirect to the Wall
        const limitPageUrl = new URL(chrome.runtime.getURL("src/limit.html"));
        const pendingUrl = typeof attemptedUrl === 'string' && attemptedUrl.length > 0
            ? attemptedUrl
            : (typeof tab.url === 'string' && tab.url.length > 0 ? tab.url : null);

        if (pendingUrl) {
            limitPageUrl.searchParams.set('pending', pendingUrl);
        }
        if (tab?.id) chrome.tabs.update(tab.id, { url: limitPageUrl.toString() });
        console.log("boomrng: Limit enforcement triggered.");
    }
}

// --- FEATURE 1: URL ENFORCEMENT ---
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        refreshEnforcementRules().catch((error) => {
            console.error("boomrng: Failed to refresh enforcement rules.", error);
        });
        updateBadge().catch((error) => {
            console.error("boomrng: Failed to update badge.", error);
        });
    }
});

async function updateEnforcementRules() {
    const data = await chrome.storage.local.get(['blockedSites', 'allowedSites', 'fallbackRedirect', 'enabled']);

    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentRuleIds = currentRules.map(rule => rule.id);
    const newRules = isFeatureEnabled(data)
        ? generateRules(
            data.blockedSites || [],
            data.allowedSites || [],
            data.fallbackRedirect
        )
        : [];

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: currentRuleIds,
        addRules: newRules
    });

    await scheduleNextTimerRefresh(data.blockedSites || []);
}

async function refreshEnforcementRules() {
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

// --- FEATURE 2: TRIGGERS ---

// Trigger A: When a new tab is created
chrome.tabs.onCreated.addListener(async (tab) => {
    await updateBadge();
    const pendingUrl = typeof tab.pendingUrl === 'string' && tab.pendingUrl.length > 0
        ? tab.pendingUrl
        : (typeof tab.url === 'string' && tab.url.length > 0 ? tab.url : null);

    if (!pendingUrl || pendingUrl === 'chrome://newtab/') return;
    await enforceTabLimit(tab, pendingUrl);
});

// Trigger B: When a tab changes URL (The Loophole Fix!)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only check if the URL actually changed
    if (changeInfo.url) {
        await enforceTabLimit(tab, changeInfo.url);
    }
});

// Trigger C: When a tab is closed
chrome.tabs.onRemoved.addListener(() => {
    updateBadge().catch((error) => {
        console.error("boomrng: Failed to update badge after tab close.", error);
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== RULE_TIMER_ALARM) return;
    refreshEnforcementRules().catch((error) => {
        console.error("boomrng: Failed to refresh rules on timer transition.", error);
    });
});

function syncStateOnBoot() {
    refreshEnforcementRules().catch((error) => {
        console.error("boomrng: Failed to initialize enforcement rules.", error);
    });
    updateBadge().catch((error) => {
        console.error("boomrng: Failed to initialize badge.", error);
    });
}

chrome.runtime.onInstalled.addListener(syncStateOnBoot);
chrome.runtime.onStartup.addListener(syncStateOnBoot);

syncStateOnBoot();
