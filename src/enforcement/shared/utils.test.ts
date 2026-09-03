import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUrlParam,
  getOriginalUrlFromHash,
  getOriginalUrl,
  goBackToOriginal,
  goBackOrToOriginal,
  requestContinuation,
  reconcileStaleEnforcementPage,
} from './utils';
import type { Constraint, ConstraintBehavior } from '../../shared/types/constraint';

/**
 * No DOM is available under the `node` test environment this repository
 * uses (adding jsdom is a real dependency change this milestone doesn't
 * need) — these functions only ever touch `window.location.search`,
 * `window.location.hash`, `window.location.href`, `window.location.pathname`,
 * `window.location.replace`, and `window.history`, so a minimal manual
 * stub of just those is enough to exercise them for real, without a full DOM.
 */
interface FakeWindow {
  location: { search: string; hash: string; href: string; pathname: string; replace: (url: string) => void };
  history: { back: () => void };
}

function setLocation(
  search: string,
  hash: string,
  pathname = '/dist/src/enforcement/checkpoint/index.html',
  href = `chrome-extension://ext${pathname}${search}${hash}`
): FakeWindow {
  const fakeWindow: FakeWindow = {
    location: {
      search,
      hash,
      pathname,
      href,
      replace: vi.fn((url: string) => {
        fakeWindow.location.href = url;
      }),
    },
    history: { back: vi.fn() },
  };
  (globalThis as unknown as { window: FakeWindow }).window = fakeWindow;
  return fakeWindow;
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
  vi.useRealTimers();
});

describe('getUrlParam', () => {
  beforeEach(() => {
    setLocation('?domain=example.com&behavior=checkpoint', '');
  });

  it('reads a query parameter by name', () => {
    expect(getUrlParam('domain')).toBe('example.com');
    expect(getUrlParam('behavior')).toBe('checkpoint');
  });

  it('returns null for a parameter that is not present', () => {
    expect(getUrlParam('missing')).toBeNull();
  });
});

describe('getOriginalUrlFromHash', () => {
  it('recovers a full original URL, including its own query string and fragment, verbatim', () => {
    const original = 'https://example.com/watch?v=abc&list=xyz#section-2';
    setLocation('?domain=example.com&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrlFromHash()).toBe(original);
  });

  it('returns null when there is no hash at all', () => {
    setLocation('?domain=example.com', '');
    expect(getOriginalUrlFromHash()).toBeNull();
  });

  it('returns null for a bare "#" with nothing after it', () => {
    setLocation('?domain=example.com', '#');
    expect(getOriginalUrlFromHash()).toBeNull();
  });

  it('does not split the recovered URL on the original URL\'s own "&" characters', () => {
    const original = 'https://example.com/path?a=1&b=2&c=3';
    setLocation('?domain=example.com', `#${original}`);
    const recovered = getOriginalUrlFromHash();
    expect(recovered).toBe(original);
    expect(recovered).toContain('&b=2&c=3');
  });
});

describe('getOriginalUrl — regression coverage for the real Chrome QA report', () => {
  it('recovers the exact reported facebook.com case', () => {
    // chrome-extension://ldmcghacdhjhglclmboldeanhbmjhegd/dist/src/enforcement/checkpoint/index.html?domain=facebook.com&behavior=checkpoint#https://www.facebook.com/
    setLocation('?domain=facebook.com&behavior=checkpoint', '#https://www.facebook.com/');
    expect(getOriginalUrl()).toBe('https://www.facebook.com/');
  });

  it('preserves a full path and query string', () => {
    const original = 'https://example.com/path/to/page?foo=bar&baz=123';
    setLocation('?domain=example.com&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('preserves protocol, hostname, port, path, query, and hash together', () => {
    const original = 'https://sub.example.com:8443/a/b?x=1&y=2#anchor';
    setLocation('?domain=example.com&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('recovers a URL containing percent-encoded characters without corrupting them', () => {
    const original = 'https://example.com/search?q=hello%20world%26more';
    setLocation('?domain=example.com&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('recovers a URL whose own hash contains query-like characters, treating everything after the first "#" as one opaque destination', () => {
    const original = 'https://example.com/page?a=1#section?not-a-real-param=2&also-not=3';
    setLocation('?domain=example.com&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('tolerates a fragment that was percent-encoded as a single unit, by decoding once', () => {
    const original = 'https://example.com/path?a=1&b=2';
    setLocation('?domain=example.com&behavior=checkpoint', `#${encodeURIComponent(original)}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('falls back to the domain reconstruction for malformed/invalid fragment data', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '#not a url at all, just text');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('falls back to the domain reconstruction for a fragment with unrecoverable percent-encoding', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '#%E0%A4%A');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('never navigates to a non-http(s) value found in the fragment (javascript:)', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '#javascript:alert(1)');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('never navigates to a non-http(s) value found in the fragment (data:)', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '#data:text/html,<script>alert(1)</script>');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('never navigates to a non-http(s) value found in the fragment (chrome-extension:)', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '#chrome-extension://other-ext/page.html');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('prefers the hash-encoded original URL over reconstructing one from the domain param', () => {
    const original = 'https://example.com/deep/page?x=1';
    setLocation('?domain=example.com&behavior=delay', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('falls back to a bare https://{domain} reconstruction only when no hash is present', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('returns null when neither a usable hash nor a domain param is present', () => {
    setLocation('', '');
    expect(getOriginalUrl()).toBeNull();
  });
});

describe('goBackToOriginal', () => {
  it('navigates to the validated original destination', () => {
    const win = setLocation('?domain=facebook.com&behavior=checkpoint', '#https://www.facebook.com/');
    goBackToOriginal();
    expect(win.location.href).toBe('https://www.facebook.com/');
    expect(win.history.back).not.toHaveBeenCalled();
  });

  it('falls back to history.back() when there is nothing safe to navigate to', () => {
    const win = setLocation('', '');
    goBackToOriginal();
    expect(win.history.back).toHaveBeenCalledOnce();
  });

  it('falls back to history.back() rather than navigating to an unsafe fragment value', () => {
    const win = setLocation('', '#javascript:alert(1)');
    goBackToOriginal();
    expect(win.history.back).toHaveBeenCalledOnce();
  });
});

describe('goBackOrToOriginal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('calls history.back() first', () => {
    const win = setLocation('?domain=example.com&behavior=checkpoint', '#https://example.com/');
    goBackOrToOriginal();
    expect(win.history.back).toHaveBeenCalledOnce();
  });

  it('does not fall back when history.back() actually navigated (location changed)', () => {
    const win = setLocation('?domain=example.com&behavior=checkpoint', '#https://example.com/');
    // Simulate history.back() succeeding by having it change location.href
    // itself, the way a real cross-document navigation would.
    (win.history.back as ReturnType<typeof vi.fn>).mockImplementation(() => {
      win.location.href = 'https://prior-page.example/';
    });

    goBackOrToOriginal();
    vi.advanceTimersByTime(200);

    expect(win.location.href).toBe('https://prior-page.example/');
  });

  it('falls back to the validated original destination once the location genuinely did not change', () => {
    const win = setLocation('?domain=example.com&behavior=checkpoint', '#https://example.com/deep/page?x=1');
    // history.back() is a no-op here — nothing changes location.href.
    const hrefBefore = win.location.href;

    goBackOrToOriginal();
    expect(win.location.href).toBe(hrefBefore); // unchanged immediately after the call — the fallback is deferred
    vi.advanceTimersByTime(200);

    expect(win.location.href).toBe('https://example.com/deep/page?x=1');
  });

  it('does nothing further when there is no history entry and no usable original destination either', () => {
    const win = setLocation('', '');
    goBackOrToOriginal();
    const hrefBefore = win.location.href;
    vi.advanceTimersByTime(200);
    expect(win.location.href).toBe(hrefBefore);
  });
});

/**
 * `requestContinuation()` is the one function Checkpoint, Delay, and PIN
 * all call to ask the background for a grant — these tests mock only
 * `chrome.runtime.sendMessage` (not the shared chrome-mock.ts, which this
 * file has never depended on) since that's the only Chrome API this
 * function touches. They prove the message is sent with the right shape
 * and the response is interpreted correctly; they cannot prove the
 * background actually grants anything real — that's continuation-service.test.ts
 * and, ultimately, real Chrome QA.
 */
describe('requestContinuation', () => {
  afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  function mockRuntime(respond: (message: unknown) => unknown) {
    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: {
        sendMessage(message: unknown, callback: (response: unknown) => void) {
          callback(respond(message));
        },
      },
    };
  }

  it('sends a REQUEST_CONTINUE message with the domain and returns true on success', async () => {
    let sentMessage: unknown;
    mockRuntime((message) => {
      sentMessage = message;
      return { success: true };
    });

    const granted = await requestContinuation('facebook.com');

    expect(sentMessage).toEqual({ type: 'REQUEST_CONTINUE', domain: 'facebook.com' });
    expect(granted).toBe(true);
  });

  it('returns false when the background reports failure', async () => {
    mockRuntime(() => ({ success: false, error: 'Invalid domain' }));
    expect(await requestContinuation('facebook.com')).toBe(false);
  });

  it('returns false rather than throwing when the response is missing/null', async () => {
    mockRuntime(() => null);
    expect(await requestContinuation('facebook.com')).toBe(false);
  });
});

/**
 * REGRESSION SUITE for a confirmed real-Chrome bug: an enforcement page
 * never re-checks the live constraint's *current* behavior against its
 * own pathname after the initial DNR redirect landed it here. A plain
 * refresh, a second tab reusing a since-stale page, or simply leaving
 * the page open while the constraint is edited elsewhere never re-runs
 * DNR — the extension's own `chrome-extension://` URL never matches a
 * block/redirect rule's condition — so Hard Block edited to Delay (or
 * any other behavior pair) left the WRONG enforcement page on screen
 * indefinitely, including a phantom Delay countdown.
 *
 * `reconcileStaleEnforcementPage()` is the single shared fix all four
 * enforcement pages (checkpoint.ts/delay.ts/pin.ts/block.ts) now call
 * first in their own `init()` — these tests exercise it directly rather
 * than duplicating page-specific harnesses for each.
 */
describe('reconcileStaleEnforcementPage — stale enforcement-page routing (confirmed real-Chrome bug)', () => {
  beforeEach(() => {
    (globalThis as unknown as { chrome: unknown }).chrome = { runtime: { id: 'ext' } };
  });

  afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  function makeConstraint(behavior: ConstraintBehavior, overrides: Partial<Constraint> = {}): Constraint {
    return {
      id: 'c1',
      domain: 'facebook.com',
      behavior,
      delayMinutes: behavior === 'delay' ? 1 : null,
      schedule: null,
      customMessage: null,
      createdAt: Date.now(),
      progressiveDelay: null,
      isPrivate: false,
      ...overrides,
    };
  }

  const PATHS: Record<'checkpoint' | 'delay' | 'pin' | 'block', string> = {
    checkpoint: '/dist/src/enforcement/checkpoint/index.html',
    delay: '/dist/src/enforcement/delay/index.html',
    pin: '/dist/src/enforcement/pin/index.html',
    block: '/dist/src/enforcement/block/index.html',
  };

  it('1. Hard Block page + live constraint now Delay → redirects to the canonical Delay page', () => {
    const win = setLocation('?domain=facebook.com&behavior=hard-block', '#https://www.facebook.com/', PATHS.block);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('delay'));
    expect(redirected).toBe(true);
    expect(win.location.replace).toHaveBeenCalledOnce();
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).toContain(PATHS.delay);
    expect(target).toContain('domain=facebook.com');
    expect(target).toContain('#https://www.facebook.com/');
  });

  it('2. Delay page + live constraint now Hard Block → redirects to the canonical Hard Block page, no Delay window is ever requested by the caller (caller must stop on true)', () => {
    const win = setLocation('?domain=facebook.com&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('hard-block', { delayMinutes: null }));
    expect(redirected).toBe(true);
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).toContain(PATHS.block);
  });

  it('3. Delay page + live constraint now Checkpoint → redirects to the canonical Checkpoint page', () => {
    const win = setLocation('?domain=facebook.com&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    reconcileStaleEnforcementPage(makeConstraint('checkpoint', { delayMinutes: null }));
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).toContain(PATHS.checkpoint);
  });

  it('4. Checkpoint page + live constraint now Hard Block → redirects to Hard Block', () => {
    const win = setLocation('?domain=facebook.com&behavior=checkpoint', '#https://www.facebook.com/', PATHS.checkpoint);
    reconcileStaleEnforcementPage(makeConstraint('hard-block', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.block);
  });

  it('5. PIN page + live constraint now Hard Block → redirects to Hard Block', () => {
    const win = setLocation('?domain=facebook.com&behavior=pin-required', '#https://www.facebook.com/', PATHS.pin);
    reconcileStaleEnforcementPage(makeConstraint('hard-block', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.block);
  });

  it('6. Hard Block page + live constraint now Checkpoint → redirects to Checkpoint', () => {
    const win = setLocation('?domain=facebook.com&behavior=hard-block', '#https://www.facebook.com/', PATHS.block);
    reconcileStaleEnforcementPage(makeConstraint('checkpoint', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.checkpoint);
  });

  it('7. same behavior as the current page → no redirect, no reload loop, caller proceeds normally', () => {
    const win = setLocation('?domain=facebook.com&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('delay'));
    expect(redirected).toBe(false);
    expect(win.location.replace).not.toHaveBeenCalled();
  });

  it('7b. a legacy behavior that collapses onto the same canonical page as the current one does not redirect either (progressive-delay → delay page)', () => {
    const win = setLocation('?domain=facebook.com&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('progressive-delay', { delayMinutes: 5 }));
    expect(redirected).toBe(false);
    expect(win.location.replace).not.toHaveBeenCalled();
  });

  it('8. no matching constraint anymore → safely exits enforcement via the existing goBackToOriginal mechanism, not a canonical-page redirect', () => {
    const win = setLocation('?domain=facebook.com&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(null);
    expect(redirected).toBe(true);
    expect(win.location.href).toBe('https://www.facebook.com/');
  });

  it('8b. no matching constraint and no usable original destination → falls back to history.back(), same as goBackToOriginal alone', () => {
    const win = setLocation('', '');
    reconcileStaleEnforcementPage(null);
    expect(win.history.back).toHaveBeenCalledOnce();
  });

  it('9. manually opened wrong enforcement page (Checkpoint URL for a live Hard Block constraint) converges to Hard Block', () => {
    const win = setLocation('?domain=facebook.com&behavior=checkpoint', '#https://www.facebook.com/', PATHS.checkpoint);
    reconcileStaleEnforcementPage(makeConstraint('hard-block', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.block);
  });

  it('10. a stale Delay page for a now-non-Delay constraint redirects away rather than the caller creating/returning a Delay authority — proven at the routing layer; delay-authority-service.test.ts separately proves the background itself also fails closed', () => {
    const win = setLocation('?domain=facebook.com&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('checkpoint', { delayMinutes: null }));
    expect(redirected).toBe(true); // delay.ts's own init() never reaches its GET_DELAY_WINDOW call after this
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.checkpoint);
  });

  it('preserves the original URL fragment exactly, unmodified, through a reroute', () => {
    const original = 'https://www.facebook.com/watch?v=abc&list=xyz#section-2';
    const win = setLocation('?domain=facebook.com&behavior=hard-block', `#${original}`, PATHS.block);
    reconcileStaleEnforcementPage(makeConstraint('delay'));
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target.endsWith(`#${original}`)).toBe(true);
  });

  it('never puts the behavior= param in the driver\'s seat — a live PIN constraint always routes to the PIN page regardless of what behavior= claimed on the stale page', () => {
    const win = setLocation('?domain=facebook.com&behavior=checkpoint', '#https://www.facebook.com/', PATHS.checkpoint);
    reconcileStaleEnforcementPage(makeConstraint('pin-required', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.pin);
  });
});
