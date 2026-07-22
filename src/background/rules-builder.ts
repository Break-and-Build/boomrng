interface BlockedSite {
  url: string;
  behavior: string;
}

function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return 'https://github.com';
  }

  let cleanUrl = url.trim();

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  try {
    const parsed = new URL(cleanUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
    return parsed.toString();
  } catch {
    console.warn('[boomrng] Invalid redirect URL provided. Using default.');
    return 'https://github.com';
  }
}

function normalizeSitePattern(siteInput: string): string | null {
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

export function generateRules(
  blockedSites: BlockedSite[],
  allowedSites: string[],
  fallbackUrl: string
): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let idCounter = 1;

  const validRedirect = sanitizeUrl(fallbackUrl);

  const normalizedAllowSites = new Set<string>();
  for (const site of allowedSites) {
    const normalizedSite = normalizeSitePattern(site);
    if (normalizedSite) {
      normalizedAllowSites.add(normalizedSite);
    }
  }

  for (const site of normalizedAllowSites) {
    rules.push({
      id: idCounter++,
      priority: 2,
      action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
      condition: {
        urlFilter: site,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    });
  }

  const normalizedBlockedSites = new Set<string>();
  for (const site of blockedSites) {
    const normalizedSite = normalizeSitePattern(site.url);
    if (!normalizedSite) continue;
    if (normalizedAllowSites.has(normalizedSite)) continue;
    normalizedBlockedSites.add(normalizedSite);
  }

  for (const site of normalizedBlockedSites) {
    rules.push({
      id: idCounter++,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { url: validRedirect },
      },
      condition: {
        urlFilter: site,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    });
  }

  return rules;
}
