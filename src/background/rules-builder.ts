import type { ConstraintBehavior } from '../shared/types/constraint';
import { normalizeDomain } from '../shared/utils/domain';
import { getEnforcementPagePath } from '../shared/services/enforcement-context-service';
import { ALLOWED_SITE_PRIORITY, redirectPriorityForDomain } from './dnr-priority';

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
 * The redirect target for a blocked site. Carries only the constraint's
 * own opaque `id` (`cid`) and `behavior` — never a domain, and never the
 * original destination in any form (BOOMRNG-V2-DESIGN-SPEC.md §30.7).
 *
 * Previously this also appended `#\0` (DNR's token for "the entire
 * matched URL") so the enforcement page could recover the original
 * destination from its own URL fragment. That was a confirmed real-Chrome
 * privacy defect: Chrome commits the fragment-bearing redirect target to
 * its permanent History before any page script — including the earliest
 * possible bootstrap — ever runs, so a client-side strip afterward cannot
 * prevent the disclosure; both the pre- and post-strip URLs end up
 * recorded as separate History entries. The destination is now captured
 * independently, in the background, via `destination-capture-service.ts`
 * (`chrome.webNavigation.onBeforeNavigate`, tab-scoped, memory-only,
 * never written to any URL, log, or storage) and served to the
 * enforcement page only after live re-validation — see that module's own
 * doc comment for the full design.
 */
export function buildRedirectSubstitution(
  extensionId: string,
  pagePath: string,
  constraintId: string,
  behavior: ConstraintBehavior
): string {
  return `chrome-extension://${extensionId}/dist/${pagePath}?cid=${encodeURIComponent(constraintId)}&behavior=${encodeURIComponent(behavior)}`;
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
      priority: ALLOWED_SITE_PRIORITY,
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
      // Specificity-based, not a flat 1 — see dnr-priority.ts. A
      // constraint on `docs.example.com` gets a strictly higher priority
      // than one on `example.com`, so when both match the same request
      // Chrome's own (well-documented, unlike same-priority ties)
      // higher-priority-wins rule deterministically picks the more
      // specific constraint, matching what findMostSpecificMatchingConstraint()
      // resolves for activation-time re-checks and destination capture.
      priority: redirectPriorityForDomain(host),
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
