import type { Constraint } from '../shared/types/constraint';
import { loadConstraints } from '../shared/storage/storage-service';
import { findMostSpecificMatchingConstraint } from '../shared/services/enforcement-context-service';
import { normalizeDomain } from '../shared/utils/domain';
import { wasConstraintClearedForTab } from './continuation-service';

/**
 * Closes the activation-time enforcement gap: DNR only ever evaluates a
 * *new* top-level navigation request, so a tab that was already open and
 * settled on a domain before a matching constraint existed (or before it
 * changed to one) stays fully usable until it happens to navigate again —
 * switching to it and back does nothing on its own. This module is the
 * decision layer for `chrome.tabs.onActivated`: on activation, re-derive
 * whether the tab's current document should actually be under
 * enforcement, and if so, force it through DNR again the same way a
 * manual refresh would (`chrome.tabs.reload`), rather than constructing
 * an enforcement URL by hand — the redirect that results is produced
 * entirely by the existing, already-hardened `rules-builder.ts` path
 * (including its §30.7 opaque `cid` handling), so there is no second,
 * duplicated URL-construction path to keep in sync or re-audit.
 *
 * Deliberately reactive only — nothing here proactively scans or reloads
 * a tab the user isn't currently looking at. A tab nobody has activated
 * yet is simply re-checked the next time they do.
 */

/**
 * The one scheme filter this module needs, mirroring the `^https?://`
 * anchor `buildBlockedSiteRegexFilter` already assumes for every DNR
 * rule — `chrome://`, `chrome-extension://`, `file://`, `about:`, etc.
 * can never match a constraint's domain and must never be handed to
 * `normalizeDomain()` (which expects a bare hostname, not a full URL, and
 * would otherwise fail closed on the path/query anyway). Returns the
 * normalized hostname for a live http(s) URL, or `null` for anything
 * else (including an unparseable or missing URL).
 */
export function extractHttpHost(url: string | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return normalizeDomain(parsed.hostname);
}

/**
 * The whole policy, in one place, deliberately trivial: reload only when
 * a live constraint matches and this tab has not already, legitimately
 * cleared this *exact* constraint id and behavior. Hard Block (and any
 * other non-continuation-eligible behavior) needs no special case here —
 * `wasConstraintClearedForTab` can never be true for one, since
 * `grantContinuation` never issues a grant for a behavior outside
 * `CONTINUATION_ELIGIBLE_BEHAVIORS` in the first place, so `isCleared` is
 * always `false` for those and this always resolves to a reload.
 */
export function shouldReloadTab(constraint: Constraint | null, isCleared: boolean): boolean {
  if (!constraint) return false;
  return !isCleared;
}

/**
 * Called from `service-worker.ts`'s `chrome.tabs.onActivated` listener.
 * Uses `findMostSpecificMatchingConstraint()` — not `findMatchingConstraint()` —
 * because `tab.url` is a real, arbitrary, live host, not something
 * already tied to a specific constraint the way every other
 * `findMatchingConstraint()` caller's input is. Exact matching here was a
 * confirmed real-Chrome bug: a tab settled on `docs.example.com` was
 * never re-enforced against a live constraint on the parent
 * `example.com`, even though DNR's own regex would redirect that exact
 * URL on any fresh navigation. `findMostSpecificMatchingConstraint()`
 * resolves the same way DNR's now-specificity-prioritized redirect rules
 * do (`dnr-priority.ts`) when a parent and a more specific child
 * constraint both exist, so this never enforces a different constraint
 * than a fresh navigation to the same URL would. Never touches
 * `chrome.declarativeNetRequest` directly; a reload is the only action
 * taken, letting the existing rule set decide the outcome exactly as it
 * would for a manual refresh (including correctly falling through to an
 * active continuation grant's higher-priority `ALLOW` rule, with no
 * awareness of that mechanism needed here).
 */
export async function checkAndEnforceTab(tabId: number): Promise<void> {
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    // Tab no longer exists (closed between the activation event firing
    // and this lookup running) — nothing to enforce.
    return;
  }

  const host = extractHttpHost(tab.url);
  if (!host) return;

  const constraints = await loadConstraints();
  const constraint = findMostSpecificMatchingConstraint(host, constraints);
  if (!constraint) return;

  const isCleared = wasConstraintClearedForTab(tabId, constraint.id, constraint.behavior);
  if (!shouldReloadTab(constraint, isCleared)) return;

  await chrome.tabs.reload(tabId);
}
