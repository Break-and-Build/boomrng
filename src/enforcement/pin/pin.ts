import { getDomain, goBackToOriginal, goBackOrToOriginal, sendMessage, requestContinuation } from '../shared/utils';

const domainEl = document.getElementById('domain');
const pinInput = document.getElementById('pin') as HTMLInputElement;
const errorEl = document.getElementById('error');
const submitBtn = document.getElementById('submit');
const goBackBtn = document.getElementById('goBack');

const domain = getDomain();

if (domainEl) {
  domainEl.textContent = domain || 'unknown';
}

// Guards against the button click and an Enter keypress both triggering
// validatePin() concurrently — a defense-in-depth measure only.
// Correctness does not depend on it: the background's continuation grant
// is idempotent per tab regardless (see continuation-service.ts).
let validationInFlight = false;

async function validatePin(): Promise<void> {
  if (validationInFlight) return;

  const pin = pinInput?.value;
  if (!pin || pin.length < 4) {
    if (errorEl) errorEl.textContent = 'Please enter a valid PIN';
    return;
  }

  validationInFlight = true;
  try {
    const response = await sendMessage({ type: 'VALIDATE_PIN', pin, domain }) as { success: boolean; data?: { valid: boolean } } | null;
    if (response?.success && response.data?.valid) {
      // PIN success is the authentication gate — it stays exactly what it
      // was. Continuation is a separate, additional step that only makes
      // the resulting navigation actually pass the DNR block; it grants
      // nothing on its own and never runs unless the PIN was already
      // correct. The page must not navigate unless this grant succeeds.
      const granted = domain ? await requestContinuation(domain) : false;
      if (granted) {
        goBackToOriginal();
      } else if (errorEl) {
        errorEl.textContent = 'Error validating PIN. Please try again.';
      }
    } else {
      if (errorEl) errorEl.textContent = 'Invalid PIN. Please try again.';
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }
  } catch {
    if (errorEl) errorEl.textContent = 'Error validating PIN. Please try again.';
  } finally {
    validationInFlight = false;
  }
}

if (submitBtn) {
  submitBtn.addEventListener('click', validatePin);
}

if (pinInput) {
  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      validatePin();
    }
  });
}

if (goBackBtn) {
  goBackBtn.addEventListener('click', () => {
    goBackOrToOriginal();
  });
}
