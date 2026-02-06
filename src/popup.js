// Load saved settings when the popup opens
document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get(['blockedSites', 'allowedSites', 'fallbackRedirect', 'maxTabs', 'enabled']);

    document.getElementById('blocked').value = (data.blockedSites || []).join('\n');
    document.getElementById('allowed').value = (data.allowedSites || []).join('\n');
    document.getElementById('redirect').value = data.fallbackRedirect || '';
    document.getElementById('maxTabs').value = data.maxTabs || '';
    document.getElementById('enabled').checked = data.enabled !== false; // Default to true
});

// Save settings when button is clicked
document.getElementById('save').addEventListener('click', () => {
    const blockedRaw = document.getElementById('blocked').value;
    const allowedRaw = document.getElementById('allowed').value;

    // Convert text areas to arrays
    const blockedSites = blockedRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const allowedSites = allowedRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    chrome.storage.local.set({
        blockedSites,
        allowedSites,
        fallbackRedirect: document.getElementById('redirect').value,
        maxTabs: document.getElementById('maxTabs').value,
        enabled: document.getElementById('enabled').checked
    }, () => {
        // Visual feedback
        const btn = document.getElementById('save');
        btn.textContent = "Saved!";
        setTimeout(() => btn.textContent = "Save Settings", 1000);
    });
});