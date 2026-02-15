document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get(['userEmail', 'userPin', 'blockedSites', 'allowedSites', 'fallbackRedirect', 'maxTabs', 'enabled']);

    const screens = {
        splash: document.getElementById('screen-splash'),
        auth: document.getElementById('screen-auth'),
        setupPin: document.getElementById('screen-setup-pin'),
        enterPin: document.getElementById('screen-enter-pin'),
        settings: document.getElementById('screen-settings')
    };

    function showScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    setTimeout(() => {
        if (!data.userPin) {
            showScreen('auth');
        } else {
            showScreen('enterPin');
        }
    }, 1500); // 1.5s splash screen

    // --- 2. AUTH SCREEN ---
    document.getElementById('skip-auth').addEventListener('click', () => showScreen('setupPin'));

    document.getElementById('btn-continue-auth').addEventListener('click', () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        if (email && pass) {
            chrome.storage.local.set({ userEmail: email, userPassMock: pass });
        }
        showScreen('setupPin');
    });

    // --- 3. SETUP PIN SCREEN ---
    document.getElementById('btn-save-pin').addEventListener('click', () => {
        const p1 = document.getElementById('setup-pin-1').value;
        const p2 = document.getElementById('setup-pin-2').value;
        const err = document.getElementById('setup-error');

        if (p1.length < 4) return err.textContent = "PIN must be at least 4 digits";
        if (p1 !== p2) return err.textContent = "PINs do not match";

        chrome.storage.local.set({ userPin: p1 }, () => {
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
            err.textContent = "Incorrect PIN";
            setTimeout(() => err.textContent = "", 2000);
        }
    });

    // --- 5. SETTINGS SCREEN (Dynamic Rows) ---
    const container = document.getElementById('blocked-sites-container');

    function addSiteRow(url = '', timer = '') {
        const row = document.createElement('div');
        row.className = 'site-row';

        row.innerHTML = `
      <input type="text" class="url-input" placeholder="youtube.com" value="${url}">
      <input type="text" class="timer-input" placeholder="HH:MM" value="${timer}">
      <button class="delete-btn" title="Delete Rule">
        <img src="../images/delete.svg" alt="Delete" width="20" height="20">
      </button>
    `;
        row.querySelector('.delete-btn').addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    document.getElementById('btn-add-site').addEventListener('click', () => addSiteRow());

    function loadSettingsData(savedData) {
        // Load Blocked Sites
        container.innerHTML = '';
        const sites = savedData.blockedSites || [];
        if (sites.length === 0) addSiteRow(); // Ensure at least one empty row

        sites.forEach(site => {
            if (typeof site === 'string') addSiteRow(site, '');
            else addSiteRow(site.url, site.timer);
        });

        document.getElementById('allowed').value = (savedData.allowedSites || []).join('\n');
        document.getElementById('redirect').value = savedData.fallbackRedirect || '';
        document.getElementById('maxTabs').value = savedData.maxTabs || '';
        document.getElementById('enabled').checked = savedData.enabled !== false;
    }

    // --- 6. SAVE SETTINGS ---
    document.getElementById('save-settings').addEventListener('click', () => {
        // Gather dynamic rows
        const blockedSites = [];
        document.querySelectorAll('.site-row').forEach(row => {
            const url = row.querySelector('.url-input').value.trim();
            const timer = row.querySelector('.timer-input').value.trim();
            if (url) {
                blockedSites.push({ url, timer });
            }
        });

        const allowedRaw = document.getElementById('allowed').value;
        const allowedSites = allowedRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        chrome.storage.local.set({
            blockedSites,
            allowedSites,
            fallbackRedirect: document.getElementById('redirect').value,
            maxTabs: document.getElementById('maxTabs').value,
            enabled: document.getElementById('enabled').checked
        }, () => {
            const btn = document.getElementById('save-settings');
            btn.textContent = "SAVED & LOCKED";
            setTimeout(() => window.close(), 1000);
        });
    });
});