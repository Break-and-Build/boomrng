import { generateRules } from './rulesBuilder.js';

// --- HELPER: Update the Badge (The "Counter") ---
async function updateBadge() {
    const data = await chrome.storage.local.get(['maxTabs', 'enabled']);
    const isEnabled = data.enabled !== false;

    if (!isEnabled) {
        chrome.action.setBadgeText({ text: "OFF" });
        chrome.action.setBadgeBackgroundColor({ color: "#6e6e6e" });
        return;
    }

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const count = tabs.length;
    const max = parseInt(data.maxTabs) || 0;

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
async function enforceTabLimit(tab) {
    const data = await chrome.storage.local.get(['maxTabs', 'enabled']);
    if (!data.enabled || !data.maxTabs) return;

    const maxTabs = parseInt(data.maxTabs);
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // If we are OVER the limit
    if (tabs.length > maxTabs) {
        // 1. Check if we are already on the limit page (Prevent infinite loops)
        if (tab.url && tab.url.includes("limit.html")) return;

        // 2. Redirect to the Wall
        const limitPageUrl = chrome.runtime.getURL("src/limit.html");
        chrome.tabs.update(tab.id, { url: limitPageUrl });
        console.log("boomrng: Limit enforcement triggered.");
    }
}

// --- FEATURE 1: URL ENFORCEMENT ---
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        updateEnforcementRules();
        updateBadge();
    }
});

async function updateEnforcementRules() {
    const data = await chrome.storage.local.get(['blockedSites', 'allowedSites', 'fallbackRedirect', 'enabled']);

    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentRuleIds = currentRules.map(rule => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: currentRuleIds
    });

    if (!data.enabled) return;

    const newRules = generateRules(
        data.blockedSites || [],
        data.allowedSites || [],
        data.fallbackRedirect
    );

    await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
    });
}

// --- FEATURE 2: TRIGGERS ---

// Trigger A: When a new tab is created
chrome.tabs.onCreated.addListener(async (tab) => {
    await updateBadge();
    await enforceTabLimit(tab);
});

// Trigger B: When a tab changes URL (The Loophole Fix!)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only check if the URL actually changed
    if (changeInfo.url) {
        await enforceTabLimit(tab);
    }
});

// Trigger C: When a tab is closed
chrome.tabs.onRemoved.addListener(() => {
    updateBadge();
});

// Initialize on startup
updateBadge();