import type { ConstraintBehavior } from '../shared/types/constraint';
import { normalizeDomain } from '../shared/utils/domain';
import { getEnforcementPagePath } from '../shared/services/enforcement-context-service';

interface BlockedSite {
  url: string;
  behavior: ConstraintBehavior;
  /** The owning constraint's own stable id — BOOMRNG-V2-DESIGN-SPEC.md §30.7: this, not the domain, is what the redirect target's query string carries. */
  id: string;
}

/**
 * Allow-site normalization only — kept separate from the blocked-site
 * path below (BOOMRNG-V2-DESIGN-SPEC.md §30.2). `allowedSites` accepts
 * looser input than a constraint domain ever can (e.g. the default
 * `localhost`, which has no TLD and would fail `normalizeDomain()`'s
 * stricter host-format check), and it isn't part of the "one effective
 * domain = one constraint" identity constraints are held to — it's a
 * general exception list, not itself a constraint.
 */
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches the same "this host or any subdomain of it, any path" shape the
 * previous `||host` DNR `urlFilter` syntax already expressed, but as a
 * RE2-compatible regex — needed because preserving the original request
 * URL (below) requires `regexFilter`/`regexSubstitution` instead of
 * `urlFilter`/a static `redirect.url`, and both conditions have to target
 * the same set of requests.
 */
export function buildBlockedSiteRegexFilter(host: string): string {
  const escapedHost = escapeRegExp(host);
  return `^https?://(?:[a-z0-9-]+\\.)*${escapedHost}(?::[0-9]+)?(?:[/?#].*)?$`;
}

/**
 * The redirect target for a blocked site. `\0` is DNR's token for "the
 * entire matched URL" — placing it after a literal `#` (never in a query
 * parameter position) is what makes this safe: `regexSubstitution` does
 * plain string substitution with no encoding, so a matched URL containing
 * its own `&`/`=`/`#`/`?` would corrupt a query-parameter position, but a
 * URL fragment is never split into key/value pairs by the browser and can
 * hold that text verbatim (BOOMRNG-V2-DESIGN-SPEC.md §30.1). This is the
 * one and only place the original destination is preserved.
 *
 * The query string carries the constraint's own opaque `id` (`cid`), not
 * its domain (§30.7 — the enforcement page resolves `cid` to the live
 * constraint itself, then uses `constraint.domain` for everything
 * downstream; nothing about that resolution needs the domain to appear
 * in a URL at all). The `#\0` fragment handoff is unchanged: each
 * enforcement page's earliest inline bootstrap script (see its own
 * `index.html`) reads it once, stores it in `sessionStorage`, and strips
 * it before any other page code runs — the fragment is never left
 * sitting in the visible URL past that first synchronous step.
 */
export function buildRedirectSubstitution(
  extensionId: string,
  pagePath: string,
  constraintId: string,
  behavior: ConstraintBehavior
): string {
  return `chrome-extension://${extensionId}/dist/${pagePath}?cid=${encodeURIComponent(constraintId)}&behavior=${encodeURIComponent(behavior)}#\\0`;
}

export function generateRules(
  blockedSites: BlockedSite[],
  allowedSites: string[],
  extensionId: string
): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let idCounter = 1;

  const normalizedAllowSites = new Set<string>();
  const allowedHosts = new Set<string>();
  for (const site of allowedSites) {
    const normalizedSite = normalizeSitePattern(site);
    if (normalizedSite) {
      normalizedAllowSites.add(normalizedSite);
    }
    const host = normalizeDomain(site);
    if (host) {
      allowedHosts.add(host);
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

  // Keyed by canonical effective domain (BOOMRNG-V2-DESIGN-SPEC.md §30.2)
  // — the same identity `normalizeDomain()` produces everywhere else a
  // domain is compared (the creation/edit guard, import, the enforcement
  // page's live constraint lookup). Two constraints that already collide
  // on this identity (only reachable via pre-existing or externally
  // written data — creation and import both now guard against it) fall
  // back to whichever is later in `blockedSites`' order silently
  // overwriting the Map entry for the earlier one; this is a defensive
  // fallback that prevents generating two conflicting DNR rules for one
  // domain, not a designed precedence rule, and which one "wins" here is
  // deliberately left unspecified.
  const blockedByBehavior = new Map<string, { host: string; behavior: ConstraintBehavior; id: string }>();

  for (const site of blockedSites) {
    const host = normalizeDomain(site.url);
    if (!host) continue;
    if (allowedHosts.has(host)) continue;
    blockedByBehavior.set(host, { host, behavior: site.behavior, id: site.id });
  }

  for (const [, { host, behavior, id: constraintId }] of blockedByBehavior) {
    const pagePath = getEnforcementPagePath(behavior);

    rules.push({
      id: idCounter++,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        // `host` remains the DNR match condition below (which requests get
        // redirected) — only the redirect *target*'s query string moved to
        // the opaque `constraintId` (§30.7).
        redirect: { regexSubstitution: buildRedirectSubstitution(extensionId, pagePath, constraintId, behavior) },
      },
      condition: {
        regexFilter: buildBlockedSiteRegexFilter(host),
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      },
    });
  }

  return rules;
}
