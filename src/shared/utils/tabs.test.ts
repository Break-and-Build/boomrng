import { describe, it, expect } from 'vitest';
import { shouldExcludeTabFromBudget } from './tabs';

function makeTab(overrides: Partial<chrome.tabs.Tab>): chrome.tabs.Tab {
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
    ...overrides,
  } as chrome.tabs.Tab;
}

describe('shouldExcludeTabFromBudget', () => {
  it('excludes a pinned tab regardless of its URL', () => {
    expect(shouldExcludeTabFromBudget(makeTab({ pinned: true, url: 'https://example.com' }))).toBe(true);
  });

  it('excludes chrome:// pages', () => {
    expect(shouldExcludeTabFromBudget(makeTab({ url: 'chrome://newtab/' }))).toBe(true);
    expect(shouldExcludeTabFromBudget(makeTab({ url: 'chrome://extensions' }))).toBe(true);
  });

  it('excludes any extension page, including every enforcement page', () => {
    const extId = 'abcdefghijklmnop';
    expect(shouldExcludeTabFromBudget(makeTab({ url: `chrome-extension://${extId}/dist/src/enforcement/checkpoint/index.html?domain=x.com` }))).toBe(true);
    expect(shouldExcludeTabFromBudget(makeTab({ url: `chrome-extension://${extId}/dist/src/enforcement/delay/index.html` }))).toBe(true);
    expect(shouldExcludeTabFromBudget(makeTab({ url: `chrome-extension://${extId}/dist/src/enforcement/pin/index.html` }))).toBe(true);
    expect(shouldExcludeTabFromBudget(makeTab({ url: `chrome-extension://${extId}/dist/src/enforcement/block/index.html` }))).toBe(true);
    expect(shouldExcludeTabFromBudget(makeTab({ url: `chrome-extension://${extId}/dist/src/enforcement/tabbudget/index.html` }))).toBe(true);
  });

  it('excludes the Chrome Web Store', () => {
    expect(shouldExcludeTabFromBudget(makeTab({ url: 'https://chromewebstore.google.com/detail/foo' }))).toBe(true);
  });

  it('counts an ordinary tab', () => {
    expect(shouldExcludeTabFromBudget(makeTab({ url: 'https://news.ycombinator.com/' }))).toBe(false);
  });

  it('counts a tab with no URL yet (e.g. still loading) rather than excluding it', () => {
    expect(shouldExcludeTabFromBudget(makeTab({ url: undefined }))).toBe(false);
  });
});
