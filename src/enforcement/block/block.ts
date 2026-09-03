import { getDomain, reconcileStaleEnforcementPage } from '../shared/utils';
import { loadEnforcementContext } from '../../shared/services';

const domainEl = document.getElementById('domain');
const goBackBtn = document.getElementById('goBack');

const domain = getDomain();

if (goBackBtn) {
  goBackBtn.addEventListener('click', () => {
    window.history.back();
  });
}

async function init(): Promise<void> {
  // Previously never looked at the live constraint at all — it rendered
  // purely from the URL's own `domain=` param, so a stale Hard Block
  // page (constraint edited to something else elsewhere, then this page
  // refreshed) never converged to the correct enforcement page the way
  // the other three already partly did via loadEnforcementContext
  // (BOOMRNG-V2-DESIGN-SPEC.md §30.9).
  const { constraint } = await loadEnforcementContext(domain);
  if (reconcileStaleEnforcementPage(constraint)) return;

  if (domainEl) {
    domainEl.textContent = domain || 'unknown';
  }
}

init();
