document.addEventListener('DOMContentLoaded', async () => {
    let data = await chrome.storage.local.get([
        'userPin',
        'blockedSites',
        'allowedSites',
        'fallbackRedirect',
        'maxTabs',
        'enabled'
    ]);

    const screens = {
        splash: document.getElementById('screen-splash'),
        setupPin: document.getElementById('screen-setup-pin'),
        enterPin: document.getElementById('screen-enter-pin'),
        settings: document.getElementById('screen-settings')
    };

    const container = document.getElementById('blocked-sites-container');
    const blockedSitesMeta = document.getElementById('blocked-sites-meta');
    const settingsError = document.getElementById('settings-error');
    const overrideStatus = document.getElementById('override-status');
    const overrideHelp = document.getElementById('override-help');
    const overrideSiteSelect = document.getElementById('override-site');
    const overridePinInput = document.getElementById('override-pin');
    const overrideTimerBtn = document.getElementById('btn-override-timer');
    const openPinSetupBtn = document.getElementById('btn-open-pin-setup');
    const cancelPinSetupBtn = document.getElementById('btn-cancel-pin-setup');
    const resetPinLockBtn = document.getElementById('btn-reset-pin-lock');
    let countdownIntervalId = null;

    function showScreen(screenName) {
        if (screenName !== 'settings') {
            stopCountdownTicker();
        }
        Object.values(screens).forEach((screen) => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function updatePinSetupButtonLabel() {
        openPinSetupBtn.textContent = data.userPin ? 'Change PIN Lock' : 'Set PIN Lock';
    }

    function setSettingsError(message = '') {
        settingsError.textContent = message;
    }

    function setOverrideStatus(message = '', isSuccess = true) {
        overrideStatus.textContent = message;
        overrideStatus.style.color = isSuccess ? '#4CAF50' : '#ff4d4d';
    }

    function normalizeSiteInput(rawInput) {
        if (typeof rawInput !== 'string') return null;
        const value = rawInput.trim();
        if (!value || /\s/.test(value)) return null;

        const withoutDomainPrefix = value.startsWith('||') ? value.slice(2) : value;
        const hasScheme = withoutDomainPrefix.startsWith('http://') || withoutDomainPrefix.startsWith('https://');
        const candidate = hasScheme ? withoutDomainPrefix : `https://${withoutDomainPrefix}`;

        try {
            const parsed = new URL(candidate);
            const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
            if (!host) return null;

            const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
            const search = parsed.search || '';
            return `${host}${path}${search}`;
        } catch {
            return null;
        }
    }

    function isValidRedirect(rawInput) {
        const value = rawInput.trim();
        if (!value) return true;
        if (/\s/.test(value)) return false;

        const hasScheme = value.startsWith('http://') || value.startsWith('https://');
        const candidate = hasScheme ? value : `https://${value}`;

        try {
            const parsed = new URL(candidate);
            return parsed.hostname.length > 0;
        } catch {
            return false;
        }
    }

    function isTimedLockActive(siteConfig, nowMs = Date.now()) {
        if (!siteConfig || typeof siteConfig !== 'object') return false;
        const timerMinutes = Number(siteConfig.timerMinutes);
        if (!Number.isFinite(timerMinutes) || timerMinutes <= 0) return false;

        const lockUntil = Number(siteConfig.lockUntil);
        if (!Number.isFinite(lockUntil) || lockUntil <= nowMs) return false;

        const bypassUntil = Number(siteConfig.bypassUntil);
        return !(Number.isFinite(bypassUntil) && bypassUntil > nowMs);
    }

    function formatRemainingTime(milliseconds) {
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }

        return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }

    function populateOverrideSites(sites, nowMs = Date.now()) {
        const selectedSite = overrideSiteSelect.value;
        const activeTimedSites = (sites || [])
            .filter((site) => site && typeof site === 'object' && isTimedLockActive(site, nowMs))
            .map((site) => {
                const lockUntil = Number(site.lockUntil);
                const remainingMinutes = Math.max(1, Math.ceil((lockUntil - nowMs) / 60000));
                return {
                    url: site.url,
                    remainingMinutes
                };
            })
            .sort((a, b) => a.remainingMinutes - b.remainingMinutes);

        overrideSiteSelect.innerHTML = '';

        if (activeTimedSites.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No active timed locks';
            overrideSiteSelect.appendChild(option);
            overrideSiteSelect.disabled = true;
            overridePinInput.disabled = true;
            overridePinInput.value = '';
            overridePinInput.placeholder = 'No timed locks to override';
            overrideTimerBtn.disabled = true;
            return 0;
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a locked site';
        overrideSiteSelect.appendChild(placeholder);

        activeTimedSites.forEach((site) => {
            const option = document.createElement('option');
            option.value = site.url;
            option.textContent = `${site.url} (${site.remainingMinutes}m left)`;
            overrideSiteSelect.appendChild(option);
        });

        const hasPreviousSelection = activeTimedSites.some((site) => site.url === selectedSite);
        overrideSiteSelect.value = hasPreviousSelection ? selectedSite : '';
        overrideSiteSelect.disabled = false;
        overridePinInput.disabled = false;
        overridePinInput.placeholder = 'Enter PIN to bypass timer';
        overrideTimerBtn.disabled = !overrideSiteSelect.value;
        return activeTimedSites.length;
    }

    function updateRowTimerStatus(row, nowMs = Date.now()) {
        const statusEl = row.parentElement.querySelector('.timer-status');
        if (!statusEl) return false;

        const timerRaw = row.querySelector('.timer-input').value.trim();
        const timerValue = Number(timerRaw);
        const timerConfigured = timerRaw.length > 0;
        statusEl.classList.remove('warn');

        if (!timerConfigured) {
            statusEl.textContent = 'Always blocked';
            return false;
        }

        if (!Number.isFinite(timerValue) || timerValue <= 0) {
            statusEl.textContent = 'Timer must be a positive number';
            statusEl.classList.add('warn');
            return false;
        }

        const currentUrl = normalizeSiteInput(row.querySelector('.url-input').value.trim() || '');
        const timerState = row._timerState;
        const matchesStoredTimer = timerState && Number(timerState.timerMinutes) === timerValue;
        const matchesStoredUrl = timerState && timerState.url === currentUrl;

        if (!timerState || !matchesStoredTimer || !matchesStoredUrl) {
            statusEl.textContent = 'Timer starts when you save';
            return false;
        }

        const lockUntil = Number(timerState.lockUntil);
        const bypassUntil = Number(timerState.bypassUntil);

        if (!Number.isFinite(lockUntil) || lockUntil <= nowMs) {
            statusEl.textContent = 'Timer expired. Save to restart';
            statusEl.classList.add('warn');
            return false;
        }

        const remainingLockMs = lockUntil - nowMs;
        if (Number.isFinite(bypassUntil) && bypassUntil > nowMs) {
            statusEl.textContent = `Bypassed for ${formatRemainingTime(bypassUntil - nowMs)}`;
            return false;
        }

        statusEl.textContent = `Blocked for ${formatRemainingTime(remainingLockMs)}`;
        return true;
    }

    function refreshLiveCountdowns() {
        const nowMs = Date.now();
        let activeRowCount = 0;

        container.querySelectorAll('.site-row').forEach((row) => {
            if (updateRowTimerStatus(row, nowMs)) activeRowCount += 1;
        });

        if (blockedSitesMeta) {
            blockedSitesMeta.textContent = activeRowCount > 0
                ? `Timer (mins) optional. ${activeRowCount} active timed lock${activeRowCount > 1 ? 's' : ''}.`
                : 'Timer (mins) optional. Blank = always blocked.';
        }

        const activeOverrideCount = populateOverrideSites(data.blockedSites || [], nowMs);
        if (!data.userPin) {
            overridePinInput.disabled = true;
            overridePinInput.value = '';
            overridePinInput.placeholder = 'Set a PIN lock to use overrides';
            overrideTimerBtn.disabled = true;
        }

        if (overrideHelp) {
            if (!data.userPin) {
                overrideHelp.textContent = 'Set a PIN lock to enable timer overrides.';
            } else {
                overrideHelp.textContent = activeOverrideCount > 0
                    ? `${activeOverrideCount} active timed lock${activeOverrideCount > 1 ? 's' : ''} available for PIN override.`
                    : 'Only active timed locks appear here.';
            }
        }
    }

    function startCountdownTicker() {
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        countdownIntervalId = window.setInterval(refreshLiveCountdowns, 1000);
    }

    function stopCountdownTicker() {
        if (!countdownIntervalId) return;
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
    }

    function addSiteRow(url = '', timerMinutes = '', timerState = null) {
        const rowWrapper = document.createElement('div');

        const row = document.createElement('div');
        row.className = 'site-row';
        row._timerState = timerState;

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.className = 'url-input';
        urlInput.placeholder = 'youtube.com';
        urlInput.value = url;

        const timerInput = document.createElement('input');
        timerInput.type = 'number';
        timerInput.min = '1';
        timerInput.step = '1';
        timerInput.className = 'timer-input';
        timerInput.placeholder = 'mins';
        timerInput.value = timerMinutes;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = 'Delete Rule';

        const icon = document.createElement('img');
        icon.src = '../images/delete.svg';
        icon.alt = 'Delete';
        icon.width = 20;
        icon.height = 20;
        deleteBtn.appendChild(icon);

        row.appendChild(urlInput);
        row.appendChild(timerInput);
        row.appendChild(deleteBtn);

        const timerStatus = document.createElement('div');
        timerStatus.className = 'timer-status';

        deleteBtn.addEventListener('click', () => {
            rowWrapper.remove();
            refreshLiveCountdowns();
        });

        timerInput.addEventListener('input', () => {
            refreshLiveCountdowns();
        });

        urlInput.addEventListener('input', () => {
            refreshLiveCountdowns();
        });

        rowWrapper.appendChild(row);
        rowWrapper.appendChild(timerStatus);
        container.appendChild(rowWrapper);
        updateRowTimerStatus(row);
    }

    function loadSettingsData(savedData) {
        container.innerHTML = '';
        const sites = savedData.blockedSites || [];

        if (sites.length === 0) {
            addSiteRow();
        } else {
            sites.forEach((site) => {
                if (typeof site === 'string') {
                    addSiteRow(site, '', null);
                    return;
                }

                const timerMinutes = Number(site.timerMinutes);
                const lockUntil = Number(site.lockUntil);
                const bypassUntil = Number(site.bypassUntil);

                addSiteRow(
                    site.url || '',
                    Number.isFinite(timerMinutes) && timerMinutes > 0 ? String(timerMinutes) : '',
                    {
                        url: normalizeSiteInput(site.url || ''),
                        timerMinutes: Number.isFinite(timerMinutes) ? timerMinutes : null,
                        lockUntil: Number.isFinite(lockUntil) ? lockUntil : null,
                        bypassUntil: Number.isFinite(bypassUntil) ? bypassUntil : null
                    }
                );
            });
        }

        document.getElementById('allowed').value = (savedData.allowedSites || []).join('\n');
        document.getElementById('redirect').value = savedData.fallbackRedirect || '';
        document.getElementById('maxTabs').value = savedData.maxTabs || '';
        document.getElementById('enabled').checked = savedData.enabled !== false;
        overridePinInput.value = '';
        setOverrideStatus('');
        updatePinSetupButtonLabel();
        refreshLiveCountdowns();
        startCountdownTicker();
    }

    document.getElementById('btn-add-site').addEventListener('click', () => addSiteRow());
    overrideSiteSelect.addEventListener('change', () => {
        overrideTimerBtn.disabled = !overrideSiteSelect.value;
    });
    window.addEventListener('beforeunload', stopCountdownTicker);

    // --- 1. SPLASH ---
    setTimeout(() => {
        if (!data.userPin) {
            loadSettingsData(data);
            showScreen('settings');
        } else {
            showScreen('enterPin');
        }
    }, 450);

    // --- 2. PIN SETUP SCREEN ---
    openPinSetupBtn.addEventListener('click', () => {
        document.getElementById('setup-pin-1').value = '';
        document.getElementById('setup-pin-2').value = '';
        document.getElementById('setup-error').textContent = '';
        showScreen('setupPin');
    });

    cancelPinSetupBtn.addEventListener('click', () => {
        loadSettingsData(data);
        showScreen('settings');
    });

    // --- 3. SAVE PIN ---
    document.getElementById('btn-save-pin').addEventListener('click', () => {
        const p1 = document.getElementById('setup-pin-1').value;
        const p2 = document.getElementById('setup-pin-2').value;
        const err = document.getElementById('setup-error');

        if (!/^\d{4,6}$/.test(p1)) return err.textContent = 'PIN must be 4-6 digits';
        if (p1 !== p2) return err.textContent = 'PINs do not match';

        chrome.storage.local.set({ userPin: p1 }, () => {
            data.userPin = p1;
            loadSettingsData(data);
            showScreen('settings');
        });
    });

    // --- 4. ENTER PIN SCREEN ---
    document.getElementById('btn-unlock').addEventListener('click', () => {
        const pin = document.getElementById('unlock-pin').value;
        if (pin === data.userPin) {
            loadSettingsData(data);
            showScreen('settings');
        } else {
            const err = document.getElementById('unlock-error');
            err.textContent = 'Incorrect PIN';
            setTimeout(() => err.textContent = '', 2000);
        }
    });

    resetPinLockBtn.addEventListener('click', () => {
        const confirmed = window.confirm('Reset PIN lock and unlock settings?');
        if (!confirmed) return;

        chrome.storage.local.remove(['userPin'], () => {
            data.userPin = null;
            document.getElementById('unlock-pin').value = '';
            loadSettingsData(data);
            showScreen('settings');
        });
    });

    // --- 5. OVERRIDE TIMED LOCK ---
    overrideTimerBtn.addEventListener('click', async () => {
        setSettingsError('');
        setOverrideStatus('');

        if (!data.userPin) {
            setOverrideStatus('Set a PIN lock before using timer override', false);
            return;
        }

        const siteToOverride = overrideSiteSelect.value;
        if (!siteToOverride) {
            setOverrideStatus('Select an active timer first', false);
            return;
        }

        const pin = overridePinInput.value.trim();
        if (!pin) {
            setOverrideStatus('Enter PIN to override timer', false);
            return;
        }

        const latest = await chrome.storage.local.get(['userPin', 'blockedSites']);
        if (pin !== latest.userPin) {
            setOverrideStatus('Incorrect PIN', false);
            return;
        }

        const nowMs = Date.now();
        let didOverride = false;
        const updatedBlockedSites = (latest.blockedSites || []).map((site) => {
            if (!site || typeof site !== 'object') return site;

            const normalizedUrl = normalizeSiteInput(site.url || '');
            if (!normalizedUrl || normalizedUrl !== siteToOverride) return site;

            const timerMinutes = Number(site.timerMinutes);
            const lockUntil = Number(site.lockUntil);
            if (!Number.isFinite(timerMinutes) || timerMinutes <= 0 || !Number.isFinite(lockUntil) || lockUntil <= nowMs) {
                return site;
            }

            didOverride = true;
            return {
                ...site,
                url: normalizedUrl,
                bypassUntil: lockUntil
            };
        });

        if (!didOverride) {
            setOverrideStatus('That timer is no longer active', false);
            return;
        }

        await chrome.storage.local.set({ blockedSites: updatedBlockedSites });
        data.blockedSites = updatedBlockedSites;
        loadSettingsData(data);
        setOverrideStatus('Timer overridden for selected site');
    });

    // --- 6. SAVE SETTINGS ---
    document.getElementById('save-settings').addEventListener('click', () => {
        setSettingsError('');
        setOverrideStatus('');

        const nowMs = Date.now();
        const existingSiteMap = new Map();
        (data.blockedSites || []).forEach((site) => {
            const siteUrl = typeof site === 'string' ? site : site.url;
            const normalizedSite = normalizeSiteInput(siteUrl || '');
            if (normalizedSite) existingSiteMap.set(normalizedSite, site);
        });

        const blockedSites = [];
        const invalidBlockedSites = [];
        const invalidTimers = [];

        document.querySelectorAll('.site-row').forEach((row) => {
            const rawSite = row.querySelector('.url-input').value.trim();
            if (!rawSite) return;

            const normalizedSite = normalizeSiteInput(rawSite);
            if (!normalizedSite) {
                invalidBlockedSites.push(rawSite);
                return;
            }

            const timerRaw = row.querySelector('.timer-input').value.trim();
            let timerMinutes = null;
            if (timerRaw) {
                if (!/^\d+$/.test(timerRaw) || Number(timerRaw) <= 0) {
                    invalidTimers.push(rawSite);
                    return;
                }
                timerMinutes = Number.parseInt(timerRaw, 10);
            }

            const existingSite = existingSiteMap.get(normalizedSite);
            let lockUntil = null;
            let bypassUntil = null;

            if (timerMinutes) {
                const sameTimer = Number(existingSite?.timerMinutes) === timerMinutes;
                const existingLockUntil = Number(existingSite?.lockUntil);
                const existingBypassUntil = Number(existingSite?.bypassUntil);
                const hasActiveExistingLock = Number.isFinite(existingLockUntil) && existingLockUntil > nowMs;
                const hasActiveExistingBypass = Number.isFinite(existingBypassUntil) && existingBypassUntil > nowMs;

                lockUntil = sameTimer && hasActiveExistingLock
                    ? existingLockUntil
                    : nowMs + (timerMinutes * 60 * 1000);

                bypassUntil = sameTimer && hasActiveExistingBypass ? existingBypassUntil : null;
            }

            blockedSites.push({
                url: normalizedSite,
                timerMinutes: timerMinutes || null,
                lockUntil,
                bypassUntil
            });
        });

        const blockedSitesDeduped = [...new Map(blockedSites.map((site) => [site.url, site])).values()];

        const allowedRaw = document.getElementById('allowed').value
            .split('\n')
            .map((site) => site.trim())
            .filter((site) => site.length > 0);

        const allowedSitesSet = new Set();
        const invalidAllowedSites = [];
        allowedRaw.forEach((site) => {
            const normalized = normalizeSiteInput(site);
            if (!normalized) {
                invalidAllowedSites.push(site);
                return;
            }
            allowedSitesSet.add(normalized);
        });

        if (invalidBlockedSites.length > 0 || invalidAllowedSites.length > 0) {
            const firstInvalid = invalidBlockedSites[0] || invalidAllowedSites[0];
            setSettingsError(`Invalid site entry: ${firstInvalid}`);
            return;
        }

        if (invalidTimers.length > 0) {
            setSettingsError(`Timer must be a positive number: ${invalidTimers[0]}`);
            return;
        }

        const redirectValue = document.getElementById('redirect').value.trim();
        if (!isValidRedirect(redirectValue)) {
            setSettingsError('Redirect URL is invalid');
            return;
        }

        const maxTabsRaw = document.getElementById('maxTabs').value.trim();
        if (maxTabsRaw && (!/^\d+$/.test(maxTabsRaw) || Number(maxTabsRaw) <= 0)) {
            setSettingsError('Max Tabs must be a positive number');
            return;
        }

        const nextData = {
            blockedSites: blockedSitesDeduped,
            allowedSites: [...allowedSitesSet],
            fallbackRedirect: redirectValue,
            maxTabs: maxTabsRaw ? String(Number.parseInt(maxTabsRaw, 10)) : '',
            enabled: document.getElementById('enabled').checked
        };

        chrome.storage.local.set(nextData, () => {
            data = { ...data, ...nextData };
            const btn = document.getElementById('save-settings');
            btn.textContent = 'SAVED & LOCKED';
            setTimeout(() => window.close(), 1000);
        });
    });
});
