import { goBackToOriginal, goBackOrToOriginal, requestContinuation, sendMessage, reconcileStaleEnforcementPage, resolveEnforcementContext } from '../shared/utils';
import { buildPinView, isSubmittablePin, shouldAutoSubmit } from './pin-view';
import type { MessageResponse } from '../../shared/types/messages';

const pageEl = document.getElementById('page');
const domainChipEl = document.getElementById('domain');
const pinAvailableEl = document.getElementById('pinAvailable');
const pinUnavailableEl = document.getElementById('pinUnavailable');
const formEl = document.getElementById('pinForm') as HTMLFormElement | null;
const pinInput = document.getElementById('pin') as HTMLInputElement | null;
const submitBtn = document.getElementById('submit') as HTMLButtonElement | null;
const goBackBtn = document.getElementById('goBack') as HTMLButtonElement | null;
const goBackUnavailableBtn = document.getElementById('goBackUnavailable') as HTMLButtonElement | null;
const errorEl = document.getElementById('error');

// Resolved asynchronously inside init(), before the form/submit handlers
// below can ever fire — BOOMRNG-V2-DESIGN-SPEC.md §30.7: the domain is
// no longer synchronously available from the URL.
let domain: string | null = null;

const SHAKE_DURATION_MS = 300;

// Guards against the auto-submit-on-6th-digit path and a manual
// Enter/click both triggering verification concurrently — a
// defense-in-depth measure only. Correctness does not depend on it: the
// background's continuation grant is idempotent per tab regardless (see
// continuation-service.ts).
let verificationInFlight = false;

function setError(message: string): void {
  if (errorEl) errorEl.textContent = message;
}

function clearError(): void {
  if (errorEl) errorEl.textContent = '';
  pinInput?.setAttribute('aria-invalid', 'false');
}

function setBusy(busy: boolean): void {
  verificationInFlight = busy;
  if (submitBtn) submitBtn.disabled = busy;
  if (pinInput) pinInput.disabled = busy;
}

/** On failure: input clears, gentle shake, error text, focus returns to the input (BOOMRNG-V2-DESIGN-SPEC.md §14). Reduced-motion is handled entirely in CSS (the animation itself is suppressed there), not branched here. */
function showWrongPin(): void {
  setError('Incorrect PIN. Try again.');
  if (pinInput) {
    pinInput.value = '';
    pinInput.setAttribute('aria-invalid', 'true');
    pinInput.classList.remove('shake');
    // Force a reflow so re-adding the class restarts the animation even
    // if it was already present (rapid repeated wrong attempts).
    void pinInput.offsetWidth;
    pinInput.classList.add('shake');
    setTimeout(() => pinInput.classList.remove('shake'), SHAKE_DURATION_MS);
    pinInput.focus();
  }
}

/**
 * A verification round-trip failure (background didn't respond, or the
 * grant was denied after a *correct* PIN) is deliberately distinct
 * copy from "Incorrect PIN." — conflating the two would tell the user
 * their PIN was wrong when the actual problem was elsewhere. Reuses the
 * exact copy Checkpoint/Delay already use for this same class of failure
 * rather than inventing new wording. The entered PIN is deliberately left
 * in place (not cleared) so retrying just re-submits it — a genuinely
 * correct PIN doesn't need to be re-typed to retry a failed grant.
 */
function showSystemError(): void {
  setError('Something went wrong. Try again.');
}

async function submitPin(): Promise<void> {
  if (verificationInFlight || !pinInput) return;
  const candidate = pinInput.value;
  if (!isSubmittablePin(candidate)) return;

  setBusy(true);
  clearError();

  try {
    const response = (await sendMessage({ type: 'VALIDATE_PIN', pin: candidate, domain })) as MessageResponse | null;
    const valid = response?.success === true && (response.data as { valid?: boolean } | undefined)?.valid === true;

    if (!valid) {
      // Re-enable before showing the failure state — showWrongPin() must
      // be able to focus the input, and a disabled element cannot take
      // focus (a real bug caught in browser QA: focus silently no-ops
      // while the field is still disabled from the in-flight request).
      setBusy(false);
      showWrongPin();
      return;
    }

    // PIN success is the authentication gate; it stays exactly what it
    // was. Continuation is a separate, additional step that only makes
    // the resulting navigation actually pass the DNR block — it grants
    // nothing on its own and never runs unless the PIN was already
    // correct, and the page never navigates unless this grant succeeds.
    const granted = domain ? await requestContinuation(domain) : false;
    if (granted) {
      await goBackToOriginal();
      return;
    }
    setBusy(false);
    showSystemError();
  } catch {
    setBusy(false);
    showSystemError();
  }
}

// Every enforcement page must be Escape-operable (BOOMRNG-V2-DESIGN-SPEC.md
// §22), and "Back to what I was doing" is the only action either state of
// this page could map Escape to (there is no panel/modal to dismiss) —
// same shared helper and the same document-level binding Checkpoint and
// Delay already use, so it works regardless of which state is showing or
// where focus currently is.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    goBackOrToOriginal();
  }
});

async function init(): Promise<void> {
  const { constraint, settings } = await resolveEnforcementContext();
  if (reconcileStaleEnforcementPage(constraint)) return;

  domain = constraint?.domain ?? null;
  const view = buildPinView(domain, constraint, settings.pin);

  if (view.showDomain && domain && domainChipEl) {
    domainChipEl.textContent = domain;
    domainChipEl.hidden = false;
  }

  if (view.showUnavailable) {
    // No configured PIN exists to verify against — do not offer PIN
    // entry at all (BOOMRNG-V2-DESIGN-SPEC.md §30.3, resolved). The
    // form/input/submit listeners below are simply never attached in
    // this branch, so no VALIDATE_PIN or continuation request can ever
    // originate from this state, independent of the DOM's own `hidden`
    // attribute on the unused block.
    if (pinUnavailableEl) pinUnavailableEl.hidden = false;
    if (goBackUnavailableBtn) {
      goBackUnavailableBtn.addEventListener('click', () => {
        goBackOrToOriginal();
      });
    }
    if (pageEl) {
      pageEl.hidden = false;
      requestAnimationFrame(() => pageEl.classList.add('is-ready'));
    }
    goBackUnavailableBtn?.focus();
    return;
  }

  if (pinAvailableEl) pinAvailableEl.hidden = false;

  if (formEl) {
    formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      submitPin();
    });
  }

  if (pinInput) {
    pinInput.addEventListener('input', () => {
      if (shouldAutoSubmit(pinInput.value)) {
        submitPin();
      }
    });
  }

  if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      goBackOrToOriginal();
    });
  }

  if (pageEl) {
    pageEl.hidden = false;
    requestAnimationFrame(() => pageEl.classList.add('is-ready'));
  }

  // Single masked input, focused automatically on load (§14) — unlike
  // Checkpoint/Delay, PIN's primary interaction is typing, not choosing
  // between two actions, so the input itself takes focus rather than a button.
  pinInput?.focus();
}

init();
