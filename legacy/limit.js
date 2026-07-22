const PENDING_TAB_URL_KEY = 'pendingTabUrl';

function getPendingUrlFromQuery() {
    const pendingUrl = new URLSearchParams(window.location.search).get('pending');
    return typeof pendingUrl === 'string' && pendingUrl.length > 0 ? pendingUrl : null;
}

async function hasAvailableTabSlot() {
    const data = await chrome.storage.local.get(['maxTabs', 'enabled']);
    if (data.enabled === false) return true;

    const maxTabs = Number.parseInt(data.maxTabs, 10);
    if (!Number.isFinite(maxTabs) || maxTabs <= 0) return true;

    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.length <= maxTabs;
}

async function restorePendingTabUrl() {
    const pendingUrlFromQuery = getPendingUrlFromQuery();
    if (pendingUrlFromQuery) {
        sessionStorage.setItem(PENDING_TAB_URL_KEY, pendingUrlFromQuery);
    }

    const pendingUrl = sessionStorage.getItem(PENDING_TAB_URL_KEY);
    if (!pendingUrl) return;

    if (await hasAvailableTabSlot()) {
        sessionStorage.removeItem(PENDING_TAB_URL_KEY);
        window.location.replace(pendingUrl);
    }
}

window.addEventListener('load', () => {
    restorePendingTabUrl().catch((error) => {
        console.error('boomrng: Failed to restore pending tab URL.', error);
    });
});
