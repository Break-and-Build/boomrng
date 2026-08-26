import { getDomain, goBackToOriginal } from '../shared/utils';

const domainEl = document.getElementById('domain');
const continueBtn = document.getElementById('continue');
const goBackBtn = document.getElementById('goBack');

const domain = getDomain();

if (domainEl) {
  domainEl.textContent = domain || 'unknown';
}

if (continueBtn) {
  continueBtn.addEventListener('click', () => {
    goBackToOriginal();
  });
}

if (goBackBtn) {
  goBackBtn.addEventListener('click', () => {
    window.history.back();
  });
}
