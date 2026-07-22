function sanitizeUrl(url) {
    // 1. If empty, go to GitHub
    if (!url || typeof url !== 'string' || url.trim() === "") {
        return "https://github.com";
    }

    let cleanUrl = url.trim();

    // 2. Add https:// if missing
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
    }

    // 3. Verify it's a real http(s) URL structure
    try {
        const parsed = new URL(cleanUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Unsupported protocol');
        }
        return parsed.toString();
    } catch (e) {
        console.warn("boomrng: Invalid redirect URL provided. Using default.");
        return "https://github.com";
    }
}

function normalizeSitePattern(siteInput) {
    if (typeof siteInput !== 'string') return null;

    const value = siteInput.trim().toLowerCase();
    if (!value || /\s/.test(value)) return null;

    if (value.startsWith('||')) {
        const domainPattern = value.slice(2);
        if (!domainPattern) return null;
        return `||${domainPattern}`;
    }

    const hasScheme = value.startsWith('http://') || value.startsWith('https://');
    const candidate = hasScheme ? value : `https://${value}`;

    try {
        const parsed = new URL(candidate);
        const host = parsed.hostname.replace(/^www\./, '');
        if (!host) return null;

        const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
        const search = parsed.search || '';
        return `||${host}${path}${search}`;
    } catch {
        return null;
    }
}

function isTimedLockActive(siteConfig, nowMs) {
    const timerMinutes = Number(siteConfig?.timerMinutes);
    if (!Number.isFinite(timerMinutes) || timerMinutes <= 0) {
        // No timer means "always blocked"
        return true;
    }

    const lockUntil = Number(siteConfig?.lockUntil);
    if (!Number.isFinite(lockUntil) || lockUntil <= nowMs) {
        return false;
    }

    const bypassUntil = Number(siteConfig?.bypassUntil);
    if (Number.isFinite(bypassUntil) && bypassUntil > nowMs) {
        return false;
    }

    return true;
}

// This file does not touch the browser. It just calculates logic.

export function generateRules(blockedSites, allowedSites, fallbackUrl, nowMs = Date.now()) {
    const rules = [];
    let idCounter = 1;

    // Clean the redirect URL before using it
    const validRedirect = sanitizeUrl(fallbackUrl);

    const normalizedAllowSites = new Set();
    allowedSites.forEach((site) => {
        const normalizedSite = normalizeSitePattern(site);
        if (!normalizedSite) return;
        normalizedAllowSites.add(normalizedSite);
    });

    // 1. ALLOW RULES (Highest Priority)
    normalizedAllowSites.forEach((site) => {
        rules.push({
            id: idCounter++,
            priority: 2,
            action: { type: "allow" },
            condition: {
                urlFilter: site,
                resourceTypes: ["main_frame"]
            }
        });
    });

    const normalizedBlockedSites = new Set();

    // 2. BLOCK RULES (Lower Priority)
    blockedSites.forEach(site => {
        if (site && typeof site === 'object' && !isTimedLockActive(site, nowMs)) return;

        // Handle both the old array of strings AND the new array of objects
        const siteUrl = typeof site === 'string' ? site : site.url;
        const normalizedSite = normalizeSitePattern(siteUrl);
        if (!normalizedSite) return;
        if (normalizedAllowSites.has(normalizedSite)) return;
        normalizedBlockedSites.add(normalizedSite);
    });

    normalizedBlockedSites.forEach((site) => {
        rules.push({
            id: idCounter++,
            priority: 1,
            action: {
                type: "redirect",
                redirect: { url: validRedirect }
            },
            condition: {
                urlFilter: site,
                resourceTypes: ["main_frame"]
            }
        });
    });

    return rules;
}
