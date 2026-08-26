import { getDomain, goBackToOriginal, sendMessage } from '../shared/utils';

const domainEl = document.getElementById('domain');
const pinInput = document.getElementById('pin') as HTMLInputElement;
const errorEl = document.getElementById('error');
const submitBtn = document.getElementById('submit');
const goBackBtn = document.getElementById('goBack');

const domain = getDomain();

if (domainEl) {
  domainEl.textContent = domain || 'unknown';
}

async function validatePin(): Promise<void> {
  const pin = pinInput?.value;
  if (!pin || pin.length < 4) {
    if (errorEl) errorEl.textContent = 'Please enter a valid PIN';
    return;
  }

  try {
    const response = await sendMessage({ type: 'VALIDATE_PIN', pin, domain }) as { success: boolean; data?: { valid: boolean } } | null;
    if (response?.success && response.data?.valid) {
      goBackToOriginal();
    } else {
      if (errorEl) errorEl.textContent = 'Invalid PIN. Please try again.';
      if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
      }
    }
  } catch {
    if (errorEl) errorEl.textContent = 'Error validating PIN. Please try again.';
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
    window.history.back();
  });
}
