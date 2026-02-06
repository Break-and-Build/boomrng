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

    // 3. Verify it's a real URL structure
    try {
        new URL(cleanUrl); // This throws an error if the URL is garbage
        return cleanUrl;
    } catch (e) {
        console.warn("boomrng: Invalid redirect URL provided. Using default.");
        return "https://github.com";
    }
}

// This file does not touch the browser. It just calculates logic.

export function generateRules(blockedSites, allowedSites, fallbackUrl) {
    const rules = [];
    let idCounter = 1;

    // Clean the redirect URL before using it
    const validRedirect = sanitizeUrl(fallbackUrl);

    // 1. ALLOW RULES (Highest Priority)
    allowedSites.forEach(site => {
        if (!site || site.trim() === "") return;
        rules.push({
            id: idCounter++,
            priority: 2,
            action: { type: "allow" },
            condition: {
                urlFilter: site.trim(),
                resourceTypes: ["main_frame"]
            }
        });
    });

    // 2. BLOCK RULES (Lower Priority)
    blockedSites.forEach(site => {
        if (!site || site.trim() === "") return;
        rules.push({
            id: idCounter++,
            priority: 1,
            action: {
                type: "redirect",
                redirect: { url: validRedirect } // Now guaranteed to be valid
            },
            condition: {
                urlFilter: site.trim(),
                resourceTypes: ["main_frame"]
            }
        });
    });

    return rules;
}