/**
 * The one shared definition of "does this tab count toward the tab
 * budget" (BOOMRNG-V2-DESIGN-SPEC.md §30.5). Before this, the popup's own
 * Dashboard count (`useTabCount.ts`) and the background's badge/enforcement
 * count (`service-worker.ts`) each computed this independently and could
 * disagree — the popup's version also checked for literal filenames
 * (`checkpoint.html`, `hardblock.html`, etc.) that never matched any real
 * URL the extension generates (every enforcement page is actually served
 * as `index.html` under a folder named after its behavior, and the Hard
 * Block folder is named `block`, not `hardblock`), which happened to be
 * harmless only because a broader `chrome-extension://` check already
 * caught every case first.
 */
export function shouldExcludeTabFromBudget(tab: chrome.tabs.Tab): boolean {
  if (tab.pinned) return true;

  const url = tab.url;
  if (!url) return false;

  if (url.startsWith('chrome://')) return true;
  if (url.startsWith('chrome-extension://')) return true;
  if (url.startsWith('https://chromewebstore.google.com')) return true;

  return false;
}

/**
 * The one canonical source of "every eligible normal tab, across every
 * normal Chrome window" — background enforcement/badge, the popup
 * Dashboard, and the Tab Budget recovery page all route through this
 * rather than each calling `chrome.tabs.query` themselves, which
 * previously let each independently (and differently) misread `{
 * currentWindow: true }` — from a service worker it resolves to the
 * last-focused window, from the popup to whichever window it's anchored
 * to, from the recovery page to that page's own window — as "the
 * budget's scope," letting a second window bypass enforcement entirely.
 *
 * `windowType: 'normal'` excludes popup/panel/devtools/app windows.
 * Incognito exclusion is deliberately done here, not inside
 * `shouldExcludeTabFromBudget()`: this project's installed `@types/chrome`
 * (`^0.0.260`) has no `incognito` field on `tabs.QueryInfo`, only on
 * `tabs.Tab` — so it's filtered on the typed, always-present
 * `tab.incognito` after the query rather than passed as an (unsupported)
 * query option. Kept out of `shouldExcludeTabFromBudget()` itself so that
 * function stays Incognito-neutral — Tab Budget parity for Incognito is
 * explicitly out of scope for V2.0 (this only excludes it from the
 * *normal* budget; it does not define what, if anything, an Incognito
 * budget would look like).
 */
export async function queryEligibleNormalTabs(): Promise<chrome.tabs.Tab[]> {
  const tabs = await chrome.tabs.query({ windowType: 'normal' });
  return tabs.filter((tab) => !tab.incognito && !shouldExcludeTabFromBudget(tab));
}
