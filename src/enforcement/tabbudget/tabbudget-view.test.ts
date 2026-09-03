import { describe, it, expect } from 'vitest';
import { getOldestTabs, isInformativeTitle, buildTabBudgetRow, buildTabBudgetView } from './tabbudget-view';

function makeTab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: false,
    active: false,
    pinned: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    url: 'https://example.com/page',
    title: 'Example Page',
    ...overrides,
  } as chrome.tabs.Tab;
}

describe('getOldestTabs', () => {
  it('sorts by ascending id (oldest-first proxy)', () => {
    const tabs = [makeTab({ id: 30 }), makeTab({ id: 10 }), makeTab({ id: 20 })];
    expect(getOldestTabs(tabs).map((t) => t.id)).toEqual([10, 20, 30]);
  });

  it('excludes pinned tabs', () => {
    const tabs = [makeTab({ id: 1, pinned: true }), makeTab({ id: 2 })];
    expect(getOldestTabs(tabs).map((t) => t.id)).toEqual([2]);
  });

  it('excludes chrome:// and chrome-extension:// tabs (including this page\'s own tab)', () => {
    const tabs = [
      makeTab({ id: 1, url: 'chrome://extensions/' }),
      makeTab({ id: 2, url: 'chrome-extension://abc/dist/src/enforcement/tabbudget/index.html' }),
      makeTab({ id: 3 }),
    ];
    expect(getOldestTabs(tabs).map((t) => t.id)).toEqual([3]);
  });

  it('does not mutate the input array', () => {
    const tabs = [makeTab({ id: 2 }), makeTab({ id: 1 })];
    const copy = [...tabs];
    getOldestTabs(tabs);
    expect(tabs).toEqual(copy);
  });
});

describe('isInformativeTitle', () => {
  it('is true for a normal, distinct title', () => {
    expect(isInformativeTitle({ title: 'Example Page', url: 'https://example.com/page' })).toBe(true);
  });

  it('is false when the title is missing or blank', () => {
    expect(isInformativeTitle({ title: undefined, url: 'https://example.com/page' })).toBe(false);
    expect(isInformativeTitle({ title: '  ', url: 'https://example.com/page' })).toBe(false);
  });

  it('is false when the title is just the URL echoed back (still-loading tab)', () => {
    expect(isInformativeTitle({ title: 'https://example.com/page', url: 'https://example.com/page' })).toBe(false);
  });
});

describe('buildTabBudgetRow', () => {
  it('uses the title as the primary label and no secondary label when the title is informative', () => {
    const row = buildTabBudgetRow(makeTab({ id: 5, title: 'Docs', url: 'https://docs.python.org/3/' }));
    expect(row).toEqual({ id: 5, primaryLabel: 'Docs', secondaryLabel: 'docs.python.org' });
  });

  it('falls back to the domain as the primary label, with no secondary line, when the title is uninformative', () => {
    const row = buildTabBudgetRow(makeTab({ id: 6, title: '', url: 'https://stackoverflow.com/questions/1' }));
    expect(row).toEqual({ id: 6, primaryLabel: 'stackoverflow.com', secondaryLabel: null });
  });

  it('falls back to the raw url when domain extraction itself fails and the title is uninformative', () => {
    const row = buildTabBudgetRow(makeTab({ id: 7, title: '', url: 'about:blank' }));
    expect(row.primaryLabel).toBe('about:blank');
    expect(row.secondaryLabel).toBeNull();
  });
});

describe('buildTabBudgetView', () => {
  it('is not resolved when count exceeds budget, oldest first', () => {
    const tabs = [makeTab({ id: 3 }), makeTab({ id: 1 }), makeTab({ id: 2 })];
    const view = buildTabBudgetView(tabs, 2, false);
    expect(view.count).toBe(3);
    expect(view.budget).toBe(2);
    expect(view.isResolved).toBe(false);
    expect(view.rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('is resolved once count is at or under budget', () => {
    const tabs = [makeTab({ id: 1 }), makeTab({ id: 2 })];
    expect(buildTabBudgetView(tabs, 2, false).isResolved).toBe(true);
    expect(buildTabBudgetView(tabs, 5, false).isResolved).toBe(true);
  });

  it('is always resolved when no budget (<= 0) is configured, matching enforceTabLimit\'s own bail-out', () => {
    const tabs = [makeTab({ id: 1 }), makeTab({ id: 2 }), makeTab({ id: 3 })];
    expect(buildTabBudgetView(tabs, 0, false).isResolved).toBe(true);
    expect(buildTabBudgetView(tabs, -1, false).isResolved).toBe(true);
  });

  it('excludes protected tabs from both the count and the rows', () => {
    const tabs = [makeTab({ id: 1, pinned: true }), makeTab({ id: 2 }), makeTab({ id: 3, url: 'chrome://newtab/' })];
    const view = buildTabBudgetView(tabs, 0, false);
    expect(view.count).toBe(1);
    expect(view.rows).toHaveLength(1);
  });
});

/**
 * REGRESSION SUITE for a confirmed real-Chrome bug: this enforcement
 * tab's own current URL (chrome-extension://.../tabbudget) is itself
 * excluded from the eligible-tab count, so resolving against
 * `eligibleCount` alone let a budget=3 case with A/B/C already open plus
 * one pending tab auto-continue immediately on page load — closing
 * nothing — because excluding this tab made the live count look like it
 * was already back at 3. Once resumed, the background's own
 * `enforceTabLimit()` immediately saw 4 counted tabs again and bounced
 * it straight back to a fresh Tab Budget page load, which recomputed the
 * identical "resolved" state and bounced it right back out again — an
 * infinite loop between the Tab Budget page and the pending destination,
 * not a one-time silent bypass. Fixed by counting the pending
 * destination itself as one more tab (`effectiveCount = eligibleCount +
 * 1`) whenever there's a real destination waiting to resume into.
 */
describe('buildTabBudgetView — pending-destination off-by-one (confirmed real-Chrome bug, fixed)', () => {
  it('1. budget 3, eligible 3 (A/B/C) + a pending destination → effective count 4, unresolved', () => {
    const tabs = [makeTab({ id: 1 }), makeTab({ id: 2 }), makeTab({ id: 3 })]; // A, B, C
    const view = buildTabBudgetView(tabs, 3, true);
    expect(view.eligibleCount).toBe(3);
    expect(view.count).toBe(4);
    expect(view.isResolved).toBe(false);
  });

  it('2. budget 3, eligible 2 + a pending destination → effective count 3, resolved', () => {
    const tabs = [makeTab({ id: 1 }), makeTab({ id: 2 })]; // A, B — one closed
    const view = buildTabBudgetView(tabs, 3, true);
    expect(view.eligibleCount).toBe(2);
    expect(view.count).toBe(3);
    expect(view.isResolved).toBe(true);
  });

  it('3. the headline reads the effective count, not the raw eligible count', () => {
    const tabs = [makeTab({ id: 1 }), makeTab({ id: 2 }), makeTab({ id: 3 })];
    const view = buildTabBudgetView(tabs, 3, true);
    // What tabbudget.ts actually interpolates into "Tab budget: N of M."
    const headline = `Tab budget: ${view.count} of ${view.budget}.`;
    expect(headline).toBe('Tab budget: 4 of 3.');
    expect(view.count).not.toBe(view.eligibleCount);
  });

  it('4. closing exactly one tab transitions the loop case from unresolved to resolved', () => {
    const budget = 3;
    const beforeClose = buildTabBudgetView(
      [makeTab({ id: 1 }), makeTab({ id: 2 }), makeTab({ id: 3 })],
      budget,
      true
    );
    expect(beforeClose.isResolved).toBe(false);

    const afterClosingOne = buildTabBudgetView([makeTab({ id: 1 }), makeTab({ id: 2 })], budget, true);
    expect(afterClosingOne.isResolved).toBe(true);
  });

  it('5. a disabled budget (<= 0) stays resolved regardless of a pending destination', () => {
    const tabs = [makeTab({ id: 1 }), makeTab({ id: 2 }), makeTab({ id: 3 })];
    expect(buildTabBudgetView(tabs, 0, true).isResolved).toBe(true);
    expect(buildTabBudgetView(tabs, -1, true).isResolved).toBe(true);
  });

  it('no pending destination means no +1 — resolves against the raw eligible count alone (e.g. a malformed pending param falling back to the excluded chrome://newtab/)', () => {
    const tabs = [makeTab({ id: 1 }), makeTab({ id: 2 }), makeTab({ id: 3 })];
    const view = buildTabBudgetView(tabs, 3, false);
    expect(view.count).toBe(3);
    expect(view.isResolved).toBe(true);
  });
});
