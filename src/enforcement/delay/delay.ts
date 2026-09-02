import { getDomain, goBackToOriginal, goBackOrToOriginal, requestContinuation } from '../shared/utils';
import { loadEnforcementContext } from '../../shared/services';
import {
  resolveDelayMinutes,
  getRemainingMs,
  buildDelayView,
  parseStoredDelayState,
  resolveDelayTiming,
  type StoredDelayState,
} from './delay-view';

const pageEl = document.getElementById('page');
const domainChipEl = document.getElementById('domain');
const readoutEl = document.getElementById('readout');
const subEl = document.getElementById('sub');
const ringFillEl = document.getElementById('ringFill') as unknown as SVGCircleElement | null;
const continueBtn = document.getElementById('continue') as HTMLButtonElement | null;
const goBackBtn = document.getElementById('goBack') as HTMLButtonElement | null;
const errorEl = document.getElementById('error');

const domain = getDomain();

// Absolute end-time persistence, keyed per domain — the storage
// mechanism itself is unchanged from the pre-V2 implementation
// (BOOMRNG-V2-DESIGN-SPEC.md §13: "keep the existing, already-correct
// pattern... should not be touched beyond adapting it to the new visual
// treatment"). Storing an absolute timestamp rather than a
// remaining-seconds counter is what makes the countdown immune to
// setInterval drift/throttling and correct across a refresh: every tick,
// running or not, re-derives "how much time is left" from `Date.now()`
// against this fixed point, never from decrementing anything.
//
// What DID need fixing: the stored value used to be a bare number with
// no record of which constraint it belonged to. Real-Chrome QA found
// that a domain-only key lets a stale, unrelated window (from a since
// -deleted/-edited constraint) survive and get silently reused by a
// logically new constraint for the same domain. The stored shape is now
// `StoredDelayState` (endTime + constraintId + the duration that endTime
// was actually computed against) — see `resolveDelayTiming()` /
// `isStoredStateUsable()` in delay-view.ts for the ownership check itself.
const STORAGE_KEY = 'boomrng_delay_ends';
const RING_RADIUS = 48;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getDelayStorageKey(): string {
  return domain ? `${STORAGE_KEY}_${domain}` : STORAGE_KEY;
}

async function getStoredDelayState(): Promise<StoredDelayState | null> {
  const key = getDelayStorageKey();
  const data = await chrome.storage.local.get(key);
  return parseStoredDelayState(data[key]);
}

async function setStoredDelayState(state: StoredDelayState): Promise<void> {
  const key = getDelayStorageKey();
  await chrome.storage.local.set({ [key]: state });
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
  const { constraint } = await loadEnforcementContext(domain);
  const delayMinutes = resolveDelayMinutes(constraint);
  const constraintId = constraint?.id ?? null;

  const now = Date.now();
  const stored = await getStoredDelayState();
  const timing = resolveDelayTiming(stored, constraintId, delayMinutes, now);
  const { endTime, totalMs } = timing;

  // Only persist when there's an actual constraint to own this window —
  // the missing-constraint fallback (deleted/edited race, same precedent
  // as Checkpoint) computes a display-only value each load rather than
  // writing something that could never be reconciled back to a real
  // constraint later.
  if (!timing.reused && constraintId) {
    await setStoredDelayState({ endTime, constraintId, delayMinutes });
  }

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
