import { getDomain } from '../shared/utils';

const domainEl = document.getElementById('domain');
const goBackBtn = document.getElementById('goBack');

const domain = getDomain();

if (domainEl) {
  domainEl.textContent = domain || 'unknown';
}

if (goBackBtn) {
  goBackBtn.addEventListener('click', () => {
    window.history.back();
  });
}
