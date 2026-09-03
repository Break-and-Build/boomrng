import { shouldExcludeTabFromBudget } from '../../shared/utils/tabs';

/**
 * Pure derivation of what the Tab Budget over-limit page should show,
 * mirroring checkpoint-view.ts/delay-view.ts/pin-view.ts/block-view.ts's
 * pattern — kept free of any `chrome.tabs.query`/`chrome.tabs.remove`
 * call so it's unit-testable under this repo's `node` test environment;
 * `tabbudget.ts` is the thin, untested-at-this-level glue that reads
 * this onto the actual page and performs the actual tab operations.
 *
 * `chrome.tabs.Tab` exposes no creation timestamp, so "oldest first"
 * (BOOMRNG-V2-DESIGN-SPEC.md §16) is approximated by ascending `id` —
 * Chrome assigns tab IDs monotonically within a browser session, a
 * reasonable, zero-new-state proxy for creation order. Tracking real
 * creation times would require new background-side state (an
 * onCreated listener + map) with its own MV3-restart staleness problem,
 * the same class of complexity already rejected for Delay's authority
 * design — not introduced here for the same reason.
 */

export function getOldestTabs(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab[] {
  return tabs
    .filter((tab) => !shouldExcludeTabFromBudget(tab))
    .slice()
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

/**
 * A title counts as informative unless it's missing or the browser is
 * just echoing the URL back (the common still-loading-tab case) — §16
 * doesn't define this precisely; this is the smallest reasonable
 * reading of "uninformative."
 */
export function isInformativeTitle(tab: Pick<chrome.tabs.Tab, 'title' | 'url'>): boolean {
  const title = tab.title?.trim();
  if (!title) return false;
  if (tab.url && title === tab.url) return false;
  return true;
}

/** Best-effort domain extraction for display only — never used for any authorization decision, so a URL that fails to parse just falls back to itself rather than being rejected. */
function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export interface TabBudgetRow {
  id: number;
  primaryLabel: string;
  secondaryLabel: string | null;
}

export function buildTabBudgetRow(tab: chrome.tabs.Tab): TabBudgetRow {
  const informative = isInformativeTitle(tab);
  const domain = extractDomain(tab.url);
  const primaryLabel = informative ? (tab.title as string).trim() : domain ?? tab.url ?? 'Untitled tab';
  const secondaryLabel = informative ? domain : null;
  return { id: tab.id ?? -1, primaryLabel, secondaryLabel };
}

export interface TabBudgetView {
  rows: TabBudgetRow[];
  /** Raw count of eligible (non-excluded) open tabs. Does NOT include this enforcement tab itself — its current URL is `chrome-extension://...`, which `shouldExcludeTabFromBudget()` always excludes. */
  eligibleCount: number;
  /**
   * What "Tab budget: N of M." actually shows, and what `isResolved` is
   * computed from — `eligibleCount` plus one more if there's a real
   * pending destination waiting to resume. Confirmed real-Chrome bug,
   * fixed here: this tab's own URL is excluded from `eligibleCount`
   * *only* because it's currently showing the Tab Budget page itself.
   * The moment it resumes to `pendingUrl`, it becomes an ordinary
   * counted tab again — so resolving based on `eligibleCount` alone
   * (its pre-fix behavior) let a budget=3 case with A/B/C already open
   * plus one pending tab auto-continue on page load with nothing
   * closed, since excluding this tab made the live count look like 3
   * again. Once it "resolved" and resumed to the pending destination,
   * the background's own `enforceTabLimit()` immediately saw 4 counted
   * tabs and bounced it right back — an infinite loop between the Tab
   * Budget page and the destination, not a one-time silent bypass.
   * The `+1` here closes that gap: resuming is only ever considered
   * resolved when there's room for this tab itself to become a normal
   * counted destination tab without immediately exceeding the budget
   * again. No pending destination (e.g. a malformed/missing `pending`
   * param, which falls back to `chrome://newtab/` — itself excluded by
   * `shouldExcludeTabFromBudget()`) means nothing new will actually
   * become a counted tab, so no `+1` applies in that case.
   */
  count: number;
  budget: number;
  /** True once `count` (the effective count, including the pending destination) is at or under `budget`, or when no budget (<= 0) is configured at all — the same "nothing to enforce" condition `enforceTabLimit()` already bails out on. */
  isResolved: boolean;
}

export function buildTabBudgetView(tabs: chrome.tabs.Tab[], budget: number, hasPendingDestination: boolean): TabBudgetView {
  const oldest = getOldestTabs(tabs);
  const eligibleCount = oldest.length;
  const count = hasPendingDestination ? eligibleCount + 1 : eligibleCount;
  return {
    rows: oldest.map(buildTabBudgetRow),
    eligibleCount,
    count,
    budget,
    isResolved: budget <= 0 || count <= budget,
  };
}
