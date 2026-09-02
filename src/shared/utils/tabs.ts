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
