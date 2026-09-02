import { getDomain, goBackToOriginal, goBackOrToOriginal, requestContinuation } from '../shared/utils';
import { loadEnforcementContext } from '../../shared/services';
import { buildCheckpointView } from './checkpoint-view';

const pageEl = document.getElementById('page');
const domainChipEl = document.getElementById('domain');
const headlineEl = document.getElementById('headline');
const reasonEl = document.getElementById('reason');
const reasonTextEl = document.getElementById('reasonText');
const continueBtn = document.getElementById('continue') as HTMLButtonElement | null;
const goBackBtn = document.getElementById('goBack') as HTMLButtonElement | null;
const errorEl = document.getElementById('error');

const domain = getDomain();

// Guards against a rapid double-click sending two overlapping requests
// from this page — a defense-in-depth measure only. Correctness does not
// depend on it: the background's grant is idempotent per tab regardless
// (see continuation-service.ts), so even without this guard a double
// grant converges to exactly one rule.
let continueRequestInFlight = false;

function setError(message: string): void {
  if (errorEl) errorEl.textContent = message;
}

function clearError(): void {
  if (errorEl) errorEl.textContent = '';
}

if (continueBtn) {
  continueBtn.addEventListener('click', () => {
    if (continueRequestInFlight || !domain) return;
    continueRequestInFlight = true;
    continueBtn.disabled = true;
    clearError();

    requestContinuation(domain)
      .then((granted) => {
        if (granted) {
          goBackToOriginal();
          return;
        }
        continueRequestInFlight = false;
        continueBtn.disabled = false;
        setError('Something went wrong. Try again.');
      })
      .catch(() => {
        continueRequestInFlight = false;
        continueBtn.disabled = false;
        setError('Something went wrong. Try again.');
      });
  });
}

if (goBackBtn) {
  goBackBtn.addEventListener('click', () => {
    goBackOrToOriginal();
  });
}

// Escape is always the safe, no-harm-done choice — same action as the
// primary button, regardless of what currently has focus, so it can never
// be mistaken for accidentally triggering Continue (BOOMRNG-V2-DESIGN-SPEC.md §12).
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    goBackOrToOriginal();
  }
});

async function init(): Promise<void> {
  const { constraint } = await loadEnforcementContext(domain);
  const view = buildCheckpointView(domain, constraint);

  if (headlineEl) headlineEl.textContent = view.headline;
  if (continueBtn) continueBtn.textContent = view.continueLabel;

  if (view.showDomain && domain && domainChipEl) {
    domainChipEl.textContent = domain;
    domainChipEl.hidden = false;
  }

  if (view.reason && reasonEl && reasonTextEl) {
    reasonTextEl.textContent = `"${view.reason}"`;
    reasonEl.hidden = false;
  }

  if (pageEl) {
    pageEl.hidden = false;
    requestAnimationFrame(() => pageEl.classList.add('is-ready'));
  }

  // Primary action is auto-focused on load, and is first in tab order —
  // the single most important fix this redesign makes (§12): the button
  // that pulls the user back to work, not toward the site.
  goBackBtn?.focus();
}

init();
