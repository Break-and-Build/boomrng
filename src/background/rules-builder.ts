import type { ConstraintBehavior } from '../shared/types/constraint';

interface BlockedSite {
  url: string;
  behavior: ConstraintBehavior;
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

function getBehaviorPagePath(behavior: ConstraintBehavior): string {
  switch (behavior) {
    case 'checkpoint':
      return 'src/enforcement/checkpoint/index.html';
    case 'delay':
    case 'progressive-delay':
      return 'src/enforcement/delay/index.html';
    case 'hard-block':
      return 'src/enforcement/block/index.html';
    case 'pin-required':
      return 'src/enforcement/pin/index.html';
    case 'reflection':
    case 'custom-message':
    case 'scheduled':
      return 'src/enforcement/checkpoint/index.html';
    default:
      return 'src/enforcement/block/index.html';
  }
}

export function generateRules(
  blockedSites: BlockedSite[],
  allowedSites: string[],
  extensionId: string
): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let idCounter = 1;

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

  const blockedByBehavior = new Map<string, { normalizedSite: string; behavior: ConstraintBehavior }>();

  for (const site of blockedSites) {
    const normalizedSite = normalizeSitePattern(site.url);
    if (!normalizedSite) continue;
    if (normalizedAllowSites.has(normalizedSite)) continue;
    blockedByBehavior.set(normalizedSite, { normalizedSite, behavior: site.behavior });
  }

  for (const [, { normalizedSite, behavior }] of blockedByBehavior) {
    const pagePath = getBehaviorPagePath(behavior);
    const domain = normalizedSite.replace(/^\|\|/, '').split('/')[0];
    const redirectUrl = `chrome-extension://${extensionId}/dist/${pagePath}?domain=${encodeURIComponent(domain)}&behavior=${encodeURIComponent(behavior)}`;

    rules.push({
      id: idCounter++,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { url: redirectUrl },
      },
      condition: {
        urlFilter: normalizedSite,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    });
  }

  return rules;
}
