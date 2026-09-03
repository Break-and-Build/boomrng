import { getUrlParam } from '../shared/utils';
import { validateUrl } from '../../shared/services/validation-service';
import { loadSettings } from '../../shared/storage/storage-service';
import { buildTabBudgetView, type TabBudgetView } from './tabbudget-view';

const pageEl = document.getElementById('page');
const headlineEl = document.getElementById('headline');
const listEl = document.getElementById('tabList');
const closeOldestBtn = document.getElementById('closeOldest') as HTMLButtonElement | null;

/**
 * Validated the same way every other enforcement page validates its
 * eventual navigation target (`getOriginalUrl()` in shared/utils.ts) —
 * found while rewriting this page: the previous "Try again" button
 * navigated to this param with no validation at all, and this page is a
 * `web_accessible_resource` matched against `<all_urls>` exactly like
 * the other four, so a directly-crafted `?pending=javascript:...` (or
 * any non-http(s) scheme) must never be trusted for navigation.
 */
const rawPending = getUrlParam('pending');
const pendingUrl = rawPending && validateUrl(rawPending) ? rawPending : null;

function goToPending(): void {
  window.location.href = pendingUrl ?? 'chrome://newtab/';
}

let actionInFlight = false;

async function queryCurrentWindowTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ currentWindow: true });
}

function renderRows(view: TabBudgetView): void {
  if (!listEl) return;
  listEl.innerHTML = '';

  for (const row of view.rows) {
    const li = document.createElement('li');
    li.className = 'tab-row';
    li.dataset.tabId = String(row.id);

    const labels = document.createElement('div');
    labels.className = 'tab-row-labels';

    const primary = document.createElement('span');
    primary.className = 'tab-row-primary';
    primary.textContent = row.primaryLabel;
    labels.appendChild(primary);

    if (row.secondaryLabel) {
      const secondary = document.createElement('span');
      secondary.className = 'tab-row-secondary';
      secondary.textContent = row.secondaryLabel;
      labels.appendChild(secondary);
    }

    li.appendChild(labels);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tab-row-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', `Close ${row.primaryLabel}`);
    closeBtn.addEventListener('click', () => closeTab(row.id, li));
    li.appendChild(closeBtn);

    listEl.appendChild(li);
  }
}

async function closeTab(tabId: number, rowEl: HTMLLIElement): Promise<void> {
  if (actionInFlight || tabId < 0) return;
  actionInFlight = true;

  // Optimistic, purely cosmetic fade — the real re-render (which will
  // simply omit this tab) is driven by the onRemoved listener below once
  // the actual close completes; this only avoids a jarring snap while
  // that round-trip is in flight (§19: "Row collapses + fades rather
  // than snapping out").
  rowEl.classList.add('closing');

  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // Tab may have already closed by some other means — the next
    // onRemoved-triggered refresh will reconcile the list regardless.
  } finally {
    actionInFlight = false;
  }
}

async function refresh(): Promise<void> {
  const [tabs, settings] = await Promise.all([queryCurrentWindowTabs(), loadSettings()]);
  const view = buildTabBudgetView(tabs, settings.tabBudget, pendingUrl !== null);

  if (view.isResolved) {
    goToPending();
    return;
  }

  if (headlineEl) headlineEl.textContent = `Tab budget: ${view.count} of ${view.budget}.`;
  renderRows(view);

  if (pageEl && pageEl.hasAttribute('hidden')) {
    pageEl.hidden = false;
    requestAnimationFrame(() => pageEl.classList.add('is-ready'));
    closeOldestBtn?.focus();
  }
}

if (closeOldestBtn) {
  closeOldestBtn.addEventListener('click', () => {
    const firstRow = listEl?.querySelector<HTMLLIElement>('.tab-row');
    const tabId = firstRow?.dataset.tabId;
    if (firstRow && tabId) {
      closeTab(Number(tabId), firstRow);
    }
  });
}

// Same chrome.tabs listeners the badge already reacts to
// (service-worker.ts's updateBadge callers) — mirrored here so this page
// re-checks and auto-continues the instant it's genuinely back under
// budget, without a manual retry click (§16).
chrome.tabs.onRemoved.addListener(() => {
  refresh().catch(() => {});
});
chrome.tabs.onCreated.addListener(() => {
  refresh().catch(() => {});
});
chrome.tabs.onUpdated.addListener(() => {
  refresh().catch(() => {});
});

refresh();
