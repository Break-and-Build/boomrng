import { goBackToOriginal, goBackOrToOriginal, requestContinuation, sendMessage, reconcileStaleEnforcementPage, resolveEnforcementContext } from '../shared/utils';
import { getRemainingMs, buildDelayView } from './delay-view';
import type { MessageResponse } from '../../shared/types/messages';

const pageEl = document.getElementById('page');
const domainChipEl = document.getElementById('domain');
const readoutEl = document.getElementById('readout');
const subEl = document.getElementById('sub');
const ringFillEl = document.getElementById('ringFill') as unknown as SVGCircleElement | null;
const continueBtn = document.getElementById('continue') as HTMLButtonElement | null;
const goBackBtn = document.getElementById('goBack') as HTMLButtonElement | null;
const errorEl = document.getElementById('error');

// Resolved asynchronously inside init(), before the page (and therefore
// GET_DELAY_WINDOW/the click handlers below) is ever reached —
// BOOMRNG-V2-DESIGN-SPEC.md §30.7: the domain is no longer synchronously
// available from the URL.
let domain: string | null = null;

const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The authoritative window (endTime, totalMs) is now owned entirely by
 * the background (`delay-authority-service.ts`) — this page only
 * displays it. Before the PIN/Delay authorization security fix, this
 * page computed and wrote `boomrng_delay_ends_<domain>` in
 * `chrome.storage.local` itself, which meant the value `REQUEST_CONTINUE`
 * would eventually need to trust was directly page-writable (forgeable
 * via DevTools, no waiting required). Asking the background for the
 * window — which independently re-derives it from the live constraint
 * and its own storage — means this page's own state can no longer
 * influence whether continuation is actually granted; it can only ask
 * to see it. `REQUEST_CONTINUE` for a delay-behavior constraint
 * re-resolves this exact same window server-side rather than trusting
 * anything from this page.
 */
async function getDelayWindow(): Promise<{ endTime: number; totalMs: number } | null> {
  const response = (await sendMessage({ type: 'GET_DELAY_WINDOW', domain })) as MessageResponse | null;
  if (response?.success !== true) return null;
  const data = response.data as { endTime?: number; totalMs?: number } | undefined;
  if (typeof data?.endTime !== 'number' || typeof data?.totalMs !== 'number') return null;
  return { endTime: data.endTime, totalMs: data.totalMs };
}

let continueRequestInFlight = false;
let lastAnnouncedText = '';

function setError(message: string): void {
  if (errorEl) errorEl.textContent = message;
}

function clearError(): void {
  if (errorEl) errorEl.textContent = '';
}

function attachContinueHandler(): void {
  if (!continueBtn) return;
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

// Escape is identical to Checkpoint: always the "back" action, regardless
// of what currently has focus (BOOMRNG-V2-DESIGN-SPEC.md §13: "identical
// semantics to Checkpoint — primary ('back') focused and Escape-triggered
// throughout").
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    goBackOrToOriginal();
  }
});

async function init(): Promise<void> {
  const { constraint } = await resolveEnforcementContext();
  if (reconcileStaleEnforcementPage(constraint)) return;

  domain = constraint?.domain ?? null;

  // Reconciliation above already confirmed the live constraint is a
  // genuine, matching `delay` behavior — so by the time GET_DELAY_WINDOW
  // is asked, this can no longer be "stale page, wrong live behavior"
  // (the background independently fails closed on that too, see
  // delay-authority-service.ts). The fallback below is reachable only
  // for a genuine transient message failure on an already-confirmed
  // delay domain, never as a substitute for a real window.
  const delayWindow = await getDelayWindow();

  const endTime = delayWindow?.endTime ?? Date.now() + 15 * 60_000;
  const totalMs = delayWindow?.totalMs ?? 15 * 60_000;

  const isPrivate = constraint?.isPrivate ?? false;
  if (domain && !isPrivate && domainChipEl) {
    domainChipEl.textContent = domain;
    domainChipEl.hidden = false;
  }

  function render(): boolean {
    const remainingMs = getRemainingMs(endTime, Date.now());
    const view = buildDelayView(domain, constraint, remainingMs, totalMs);

    // The live region's text is only actually written to the DOM when it
    // changes — the readout/sub-copy are minute-granular by construction
    // (formatRemainingMinutes), so this fires at whole-minute boundaries
    // and the running->complete transition, never every second-tick
    // (§22: "never announcing every second"), regardless of how a given
    // screen reader treats an identical-value re-write.
    const combined = `${view.readout} ${view.subCopy}`;
    if (combined !== lastAnnouncedText) {
      lastAnnouncedText = combined;
      if (readoutEl) readoutEl.textContent = view.readout;
      if (subEl) subEl.textContent = view.subCopy;
    }

    if (ringFillEl) {
      const offset = RING_CIRCUMFERENCE * view.ringFraction;
      ringFillEl.setAttribute('stroke-dashoffset', offset.toFixed(1));
    }

    if (view.isComplete) {
      if (continueBtn) {
        continueBtn.textContent = view.continueLabel;
        // Revealed only once, not re-hidden if render() runs again —
        // becoming available never becomes unavailable again mid-page-life.
        continueBtn.hidden = false;
      }
      return true;
    }
    return false;
  }

  attachContinueHandler();

  const isCompleteNow = render();
  if (pageEl) {
    pageEl.hidden = false;
    requestAnimationFrame(() => pageEl.classList.add('is-ready'));
  }
  // Primary action always autofocuses, whether or not Continue is already
  // available — Continue never grabs focus on its own, matching the
  // Checkpoint precedent and §13's "joins the tab order after the
  // primary button, never before it."
  goBackBtn?.focus();

  if (!isCompleteNow) {
    const timer = setInterval(() => {
      if (render()) {
        clearInterval(timer);
      }
    }, 1000);
  }
}

init();
