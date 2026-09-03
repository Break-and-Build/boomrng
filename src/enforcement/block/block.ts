import { reconcileStaleEnforcementPage, resolveEnforcementContext } from '../shared/utils';
import { buildBlockView } from './block-view';

const pageEl = document.getElementById('page');
const domainChipEl = document.getElementById('domain');
const goBackBtn = document.getElementById('goBack') as HTMLButtonElement | null;

/**
 * Deliberately plain `history.back()` — NOT `goBackOrToOriginal()` or
 * `goBackToOriginal()`. BOOMRNG-V2-DESIGN-SPEC.md §15: "Hard Block's
 * 'Go Back' deliberately does not use goBackOrToOriginal() and keeps
 * plain history.back() — §15's whole point is that Hard Block offers no
 * path through to the blocked destination under any circumstance, so
 * giving its one button a fallback that could land on that destination
 * would silently reopen the exact escape hatch Hard Block exists to
 * close." Both the button and Escape call this same function, never the
 * shared original-URL fallback every other enforcement page uses.
 */
function goBack(): void {
  window.history.back();
}

if (goBackBtn) {
  goBackBtn.addEventListener('click', goBack);
}

// Escape maps to the same single action every other enforcement page
// maps it to (§22: the entire product must be Escape-operable) — but
// here that action is the restricted plain goBack() above, not the
// shared goBackOrToOriginal() helper.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    goBack();
  }
});

async function init(): Promise<void> {
  const { constraint } = await resolveEnforcementContext();
  if (reconcileStaleEnforcementPage(constraint)) return;

  const domain = constraint?.domain ?? null;
  const view = buildBlockView(domain, constraint);

  if (view.showDomain && domain && domainChipEl) {
    domainChipEl.textContent = domain;
    domainChipEl.hidden = false;
  }

  if (pageEl) {
    pageEl.hidden = false;
    requestAnimationFrame(() => pageEl.classList.add('is-ready'));
  }

  // Single action, autofocused on load — matches Checkpoint/Delay/PIN's
  // own precedent of always focusing the primary action.
  goBackBtn?.focus();
}

init();
