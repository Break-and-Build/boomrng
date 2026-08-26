import { getDomain, goBackToOriginal } from '../shared/utils';

const domainEl = document.getElementById('domain');
const countdownEl = document.getElementById('countdown');
const progressEl = document.getElementById('progress');
const continueBtn = document.getElementById('continue');
const goBackBtn = document.getElementById('goBack');

const domain = getDomain();
const DELAY_SECONDS = 30;
const STORAGE_KEY = 'boomrng_delay_ends';

if (domainEl) {
  domainEl.textContent = domain || 'unknown';
}

function getDelayStorageKey(): string {
  return domain ? `${STORAGE_KEY}_${domain}` : STORAGE_KEY;
}

async function getDelayEndTime(): Promise<number | null> {
  if (!domain) return null;
  const key = getDelayStorageKey();
  const data = await chrome.storage.local.get(key);
  return data[key] || null;
}

async function setDelayEndTime(endTime: number): Promise<void> {
  if (!domain) return;
  const key = getDelayStorageKey();
  await chrome.storage.local.set({ [key]: endTime });
}

function updateCountdown(remaining: number): void {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  if (countdownEl) {
    countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  if (progressEl) {
    const progress = ((DELAY_SECONDS - remaining) / DELAY_SECONDS) * 100;
    progressEl.style.width = `${progress}%`;
  }
}

function onComplete(): void {
  if (continueBtn) {
    (continueBtn as HTMLButtonElement).disabled = false;
  }
  if (countdownEl) {
    countdownEl.textContent = '0:00';
  }
  if (progressEl) {
    progressEl.style.width = '100%';
  }
}

async function initDelay(): Promise<void> {
  const now = Date.now();
  let endTime = await getDelayEndTime();

  if (!endTime || endTime <= now) {
    endTime = now + DELAY_SECONDS * 1000;
    await setDelayEndTime(endTime);
  }

  const remainingMs = Math.max(0, endTime - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  if (remainingSec <= 0) {
    onComplete();
    return;
  }

  updateCountdown(remainingSec);

  const timer = setInterval(() => {
    const currentRemaining = Math.max(0, Math.ceil((endTime! - Date.now()) / 1000));
    updateCountdown(currentRemaining);
    if (currentRemaining <= 0) {
      clearInterval(timer);
      onComplete();
    }
  }, 1000);
}

initDelay();

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
