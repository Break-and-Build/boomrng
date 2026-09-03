import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUrlParam,
  getOriginalUrlFromHash,
  getOriginalUrl,
  goBackToOriginal,
  goBackOrToOriginal,
  requestContinuation,
  reconcileStaleEnforcementPage,
  resolveEnforcementContext,
  computeOriginalUrlBootstrapAction,
  applyOriginalUrlBootstrapAction,
  ORIGINAL_URL_STORAGE_KEY,
} from './utils';
import { installChromeMock, uninstallChromeMock } from '../../shared/testing/chrome-mock';
import type { Constraint, ConstraintBehavior } from '../../shared/types/constraint';

/**
 * No DOM is available under the `node` test environment this repository
 * uses (adding jsdom is a real dependency change this milestone doesn't
 * need) — these functions only ever touch `window.location.search`,
 * `window.location.hash`, `window.location.href`, `window.location.pathname`,
 * `window.location.replace`, `window.history`, and (as of §30.7)
 * `window.sessionStorage`, so a minimal manual stub of just those is
 * enough to exercise them for real, without a full DOM.
 *
 * `sessionStore` is an optional externally-owned backing object so tests
 * can simulate "the same tab, a later load" by passing the *same* object
 * into a second `setLocation()` call — real `sessionStorage` persists
 * across same-origin navigations within one tab, but each `setLocation()`
 * call here otherwise creates a brand-new, empty one (a genuinely fresh
 * tab/origin), matching what a fresh unrelated test needs by default.
 */
interface FakeWindow {
  location: { search: string; hash: string; href: string; pathname: string; replace: (url: string) => void };
  history: { back: () => void };
  sessionStorage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; removeItem: (key: string) => void };
}

function setLocation(
  search: string,
  hash: string,
  pathname = '/dist/src/enforcement/checkpoint/index.html',
  href = `chrome-extension://ext${pathname}${search}${hash}`,
  sessionStore: Record<string, string> = {}
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
    sessionStorage: {
      getItem: (key) => (key in sessionStore ? sessionStore[key] : null),
      setItem: (key, value) => {
        sessionStore[key] = value;
      },
      removeItem: (key) => {
        delete sessionStore[key];
      },
    },
  };
  (globalThis as unknown as { window: FakeWindow }).window = fakeWindow;
  return fakeWindow;
}

/** Runs the same decide-then-apply sequence each inline bootstrap snippet performs, against the currently-installed fake window — used by tests to simulate "the bootstrap already ran for this load" without duplicating its two-step shape inline in every test. */
function runBootstrap(): void {
  applyOriginalUrlBootstrapAction(computeOriginalUrlBootstrapAction(window.location.hash));
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

/**
 * REGRESSION SUITE for BOOMRNG-V2-DESIGN-SPEC.md §30.7's opaque-identity
 * redesign — the exact decision each enforcement page's earliest inline
 * bootstrap script re-implements as raw, duplicated classic JS (it runs
 * before any module code, so it can't import this). Exhaustive coverage
 * here is what actually proves the lifecycle rule correct; the inline
 * duplicate itself can only be verified by real-Chrome QA, not vitest.
 */
describe('computeOriginalUrlBootstrapAction — sessionStorage lifecycle decision (§30.7)', () => {
  it('hash present + valid http(s) URL → store', () => {
    expect(computeOriginalUrlBootstrapAction('#https://example.com/page')).toEqual({
      type: 'store',
      value: 'https://example.com/page',
    });
  });

  it('hash present + valid, percent-encoded as a single unit → store, decoded once', () => {
    const original = 'https://example.com/path?a=1&b=2';
    expect(computeOriginalUrlBootstrapAction(`#${encodeURIComponent(original)}`)).toEqual({
      type: 'store',
      value: original,
    });
  });

  it('hash present + invalid (not a URL at all) → clear, not left alone', () => {
    expect(computeOriginalUrlBootstrapAction('#not a url at all')).toEqual({ type: 'clear' });
  });

  it('hash present + non-http(s) scheme → clear', () => {
    expect(computeOriginalUrlBootstrapAction('#javascript:alert(1)')).toEqual({ type: 'clear' });
    expect(computeOriginalUrlBootstrapAction('#chrome-extension://other-ext/page.html')).toEqual({ type: 'clear' });
  });

  it('hash present + unrecoverable percent-encoding → clear', () => {
    expect(computeOriginalUrlBootstrapAction('#%E0%A4%A')).toEqual({ type: 'clear' });
  });

  it('hash absent entirely → noop, leaves any existing stored value alone', () => {
    expect(computeOriginalUrlBootstrapAction('')).toEqual({ type: 'noop' });
    expect(computeOriginalUrlBootstrapAction(null)).toEqual({ type: 'noop' });
  });

  it('a bare "#" with nothing after it → noop', () => {
    expect(computeOriginalUrlBootstrapAction('#')).toEqual({ type: 'noop' });
  });
});

describe('sessionStorage lifecycle for the stored original destination, end to end (§30.7)', () => {
  it('fresh DNR arrival with a fragment validates and stores it', () => {
    setLocation('?cid=c1&behavior=checkpoint', '#https://a.example/');
    runBootstrap();
    expect(window.sessionStorage.getItem(ORIGINAL_URL_STORAGE_KEY)).toBe('https://a.example/');
  });

  it('refresh (fragment already stripped by the prior load) reuses the stored original', () => {
    const store: Record<string, string> = {};
    setLocation('?cid=c1&behavior=checkpoint', '#https://a.example/', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    runBootstrap();

    // Simulate the refresh: same tab (same store), hash already gone.
    setLocation('?cid=c1&behavior=checkpoint', '', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    expect(getOriginalUrl()).toBe('https://a.example/');
  });

  it('an internal reconciliation reroute (built without a fragment, by design) reuses the stored original in the same tab', () => {
    const store: Record<string, string> = {};
    setLocation('?cid=c1&behavior=hard-block', '#https://a.example/', '/dist/src/enforcement/block/index.html', undefined, store);
    runBootstrap();

    // Simulate landing on the reroute target: same tab/store, no fragment.
    setLocation('?cid=c1&behavior=delay', '', '/dist/src/enforcement/delay/index.html', undefined, store);
    expect(getOriginalUrl()).toBe('https://a.example/');
  });

  it('a later, unrelated constrained navigation in the same tab overwrites the previous stored original', () => {
    const store: Record<string, string> = {};
    setLocation('?cid=a&behavior=checkpoint', '#https://a.example/', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    runBootstrap();
    expect(getOriginalUrl()).toBe('https://a.example/');

    // A genuinely new DNR match in the same tab, a different domain entirely.
    setLocation('?cid=b&behavior=checkpoint', '#https://b.example/', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    runBootstrap();
    expect(getOriginalUrl()).toBe('https://b.example/');
  });

  it('REGRESSION: domain A stores a valid original, a later load in the same tab has an invalid fragment → stored value is cleared, not left as A', () => {
    const store: Record<string, string> = {};
    setLocation('?cid=a&behavior=checkpoint', '#https://a.example/', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    runBootstrap();
    expect(getOriginalUrl()).toBe('https://a.example/');

    setLocation('?cid=b&behavior=checkpoint', '#not a url at all', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    runBootstrap();

    expect(window.sessionStorage.getItem(ORIGINAL_URL_STORAGE_KEY)).toBeNull();
    expect(getOriginalUrl()).not.toBe('https://a.example/');
  });
});

describe('getOriginalUrl — regression coverage for the real Chrome QA report', () => {
  it('recovers the exact reported facebook.com case', () => {
    // chrome-extension://ldmcghacdhjhglclmboldeanhbmjhegd/dist/src/enforcement/checkpoint/index.html?cid=c1&behavior=checkpoint#https://www.facebook.com/
    setLocation('?cid=c1&behavior=checkpoint', '#https://www.facebook.com/');
    expect(getOriginalUrl()).toBe('https://www.facebook.com/');
  });

  it('preserves a full path and query string', () => {
    const original = 'https://example.com/path/to/page?foo=bar&baz=123';
    setLocation('?cid=c1&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('preserves protocol, hostname, port, path, query, and hash together', () => {
    const original = 'https://sub.example.com:8443/a/b?x=1&y=2#anchor';
    setLocation('?cid=c1&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('recovers a URL containing percent-encoded characters without corrupting them', () => {
    const original = 'https://example.com/search?q=hello%20world%26more';
    setLocation('?cid=c1&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('recovers a URL whose own hash contains query-like characters, treating everything after the first "#" as one opaque destination', () => {
    const original = 'https://example.com/page?a=1#section?not-a-real-param=2&also-not=3';
    setLocation('?cid=c1&behavior=checkpoint', `#${original}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('tolerates a fragment that was percent-encoded as a single unit, by decoding once', () => {
    const original = 'https://example.com/path?a=1&b=2';
    setLocation('?cid=c1&behavior=checkpoint', `#${encodeURIComponent(original)}`);
    expect(getOriginalUrl()).toBe(original);
  });

  it('reads from sessionStorage when the hash is already gone (the normal post-bootstrap case)', () => {
    const store: Record<string, string> = {};
    setLocation('?cid=c1&behavior=checkpoint', '#https://example.com/stored', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    runBootstrap();
    setLocation('?cid=c1&behavior=checkpoint', '', '/dist/src/enforcement/checkpoint/index.html', undefined, store);
    expect(getOriginalUrl()).toBe('https://example.com/stored');
  });

  it('falls back to the domain reconstruction for malformed/invalid fragment data with nothing stored', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '#not a url at all, just text');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('falls back to the domain reconstruction for a fragment with unrecoverable percent-encoding, nothing stored', () => {
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

  it('falls back to a bare https://{domain} reconstruction only when no hash and nothing stored is present', () => {
    setLocation('?domain=example.com&behavior=checkpoint', '');
    expect(getOriginalUrl()).toBe('https://example.com');
  });

  it('returns null when neither a usable hash, a stored value, nor a domain param is present', () => {
    setLocation('', '');
    expect(getOriginalUrl()).toBeNull();
  });
});

describe('goBackToOriginal', () => {
  it('navigates to the validated original destination', () => {
    const win = setLocation('?cid=c1&behavior=checkpoint', '#https://www.facebook.com/');
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
    const win = setLocation('?cid=c1&behavior=checkpoint', '#https://example.com/');
    goBackOrToOriginal();
    expect(win.history.back).toHaveBeenCalledOnce();
  });

  it('does not fall back when history.back() actually navigated (location changed)', () => {
    const win = setLocation('?cid=c1&behavior=checkpoint', '#https://example.com/');
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
    const win = setLocation('?cid=c1&behavior=checkpoint', '#https://example.com/deep/page?x=1');
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
 * than duplicating page-specific harnesses for each. Since
 * BOOMRNG-V2-DESIGN-SPEC.md §30.7, the rebuilt URL carries the live
 * constraint's own `id` (`cid`), never a domain or the original
 * destination.
 */
describe('reconcileStaleEnforcementPage — stale enforcement-page routing (confirmed real-Chrome bug)', () => {
  beforeEach(() => {
    (globalThis as unknown as { chrome: unknown }).chrome = { runtime: { id: 'ext' } };
  });

  afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  it('1. Hard Block page + live constraint now Delay → redirects to the canonical Delay page, carrying the constraint\'s own id', () => {
    const win = setLocation('?cid=c1&behavior=hard-block', '#https://www.facebook.com/', PATHS.block);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('delay'));
    expect(redirected).toBe(true);
    expect(win.location.replace).toHaveBeenCalledOnce();
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).toContain(PATHS.delay);
    expect(target).toContain('cid=c1');
    expect(target).not.toContain('domain=');
  });

  it('2. Delay page + live constraint now Hard Block → redirects to the canonical Hard Block page, no Delay window is ever requested by the caller (caller must stop on true)', () => {
    const win = setLocation('?cid=c1&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('hard-block', { delayMinutes: null }));
    expect(redirected).toBe(true);
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).toContain(PATHS.block);
  });

  it('3. Delay page + live constraint now Checkpoint → redirects to the canonical Checkpoint page', () => {
    const win = setLocation('?cid=c1&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    reconcileStaleEnforcementPage(makeConstraint('checkpoint', { delayMinutes: null }));
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).toContain(PATHS.checkpoint);
  });

  it('4. Checkpoint page + live constraint now Hard Block → redirects to Hard Block (also the "crafted Checkpoint URL carrying a Hard Block cid" adversarial case, at the routing layer)', () => {
    const win = setLocation('?cid=hb-1&behavior=checkpoint', '#https://www.facebook.com/', PATHS.checkpoint);
    reconcileStaleEnforcementPage(makeConstraint('hard-block', { id: 'hb-1', delayMinutes: null }));
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).toContain(PATHS.block);
    expect(target).toContain('cid=hb-1');
  });

  it('5. PIN page + live constraint now Hard Block → redirects to Hard Block', () => {
    const win = setLocation('?cid=c1&behavior=pin-required', '#https://www.facebook.com/', PATHS.pin);
    reconcileStaleEnforcementPage(makeConstraint('hard-block', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.block);
  });

  it('6. Hard Block page + live constraint now Checkpoint → redirects to Checkpoint', () => {
    const win = setLocation('?cid=c1&behavior=hard-block', '#https://www.facebook.com/', PATHS.block);
    reconcileStaleEnforcementPage(makeConstraint('checkpoint', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.checkpoint);
  });

  it('7. same behavior as the current page → no redirect, no reload loop, caller proceeds normally', () => {
    const win = setLocation('?cid=c1&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('delay'));
    expect(redirected).toBe(false);
    expect(win.location.replace).not.toHaveBeenCalled();
  });

  it('7b. a legacy behavior that collapses onto the same canonical page as the current one does not redirect either (progressive-delay → delay page)', () => {
    const win = setLocation('?cid=c1&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('progressive-delay', { delayMinutes: 5 }));
    expect(redirected).toBe(false);
    expect(win.location.replace).not.toHaveBeenCalled();
  });

  it('8. no matching constraint anymore (unknown/deleted cid) → safely exits enforcement via the existing goBackToOriginal mechanism, not a canonical-page redirect', () => {
    const win = setLocation('?cid=deleted-id&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
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
    const win = setLocation('?cid=hb-1&behavior=checkpoint', '#https://www.facebook.com/', PATHS.checkpoint);
    reconcileStaleEnforcementPage(makeConstraint('hard-block', { id: 'hb-1', delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.block);
  });

  it('10. a stale Delay page for a now-non-Delay constraint redirects away rather than the caller creating/returning a Delay authority — proven at the routing layer; delay-authority-service.test.ts separately proves the background itself also fails closed', () => {
    const win = setLocation('?cid=c1&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('checkpoint', { delayMinutes: null }));
    expect(redirected).toBe(true); // delay.ts's own init() never reaches its GET_DELAY_WINDOW call after this
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.checkpoint);
  });

  it('11. crafted Delay URL carrying a Checkpoint constraint\'s cid → reconciles to Checkpoint, no Delay authority path reached', () => {
    const win = setLocation('?cid=cp-1&behavior=delay', '#https://www.facebook.com/', PATHS.delay);
    const redirected = reconcileStaleEnforcementPage(makeConstraint('checkpoint', { id: 'cp-1', delayMinutes: null }));
    expect(redirected).toBe(true);
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.checkpoint);
  });

  it('never re-embeds the original destination in the rebuilt URL — no fragment at all, regardless of what this page\'s own fragment was', () => {
    const original = 'https://www.facebook.com/watch?v=abc&list=xyz#section-2';
    const win = setLocation('?cid=c1&behavior=hard-block', `#${original}`, PATHS.block);
    reconcileStaleEnforcementPage(makeConstraint('delay'));
    const target = (win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(target).not.toContain('#');
  });

  it('never puts the behavior= param in the driver\'s seat — a live PIN constraint always routes to the PIN page regardless of what behavior= claimed on the stale page', () => {
    const win = setLocation('?cid=c1&behavior=checkpoint', '#https://www.facebook.com/', PATHS.checkpoint);
    reconcileStaleEnforcementPage(makeConstraint('pin-required', { delayMinutes: null }));
    expect((win.location.replace as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain(PATHS.pin);
  });
});

/**
 * REGRESSION SUITE for BOOMRNG-V2-DESIGN-SPEC.md §30.7's opaque `cid`
 * resolution, including the adversarial cross-constraint cases: a
 * crafted URL's `cid` always resolves to whatever it actually names in
 * live storage — never anything implied by the page's own prior
 * pathname or `domain=`. Downstream authorization (grantContinuation,
 * resolveDelayWindow, PIN's tab+domain+constraintId scoping) is
 * untouched by this milestone and already independently re-validates
 * the resolved constraint's own domain on every request — see
 * continuation-service.test.ts and delay-authority-service.test.ts,
 * which exercise those same guarantees without ever needing a `cid` at
 * all, since the background never receives one.
 */
describe('resolveEnforcementContext — id-based resolution, adversarial cases (§30.7)', () => {
  afterEach(() => {
    uninstallChromeMock();
  });

  function seed(constraints: Constraint[]) {
    installChromeMock({
      constraints,
      settings: { pin: null, tabBudget: 10, allowedSites: [], schemaVersion: 1 },
    });
  }

  it('a crafted Checkpoint-page URL carrying a Hard Block constraint\'s cid resolves to that Hard Block constraint', async () => {
    seed([makeConstraint('hard-block', { id: 'hb-1', domain: 'blocked.example', delayMinutes: null })]);
    setLocation('?cid=hb-1&behavior=checkpoint', '', PATHS.checkpoint);

    const { constraint } = await resolveEnforcementContext();

    expect(constraint?.id).toBe('hb-1');
    expect(constraint?.behavior).toBe('hard-block');
    expect(constraint?.domain).toBe('blocked.example');
  });

  it('a crafted Delay-page URL carrying a Checkpoint constraint\'s cid resolves to that Checkpoint constraint', async () => {
    seed([makeConstraint('checkpoint', { id: 'cp-1', domain: 'checkpoint.example' })]);
    setLocation('?cid=cp-1&behavior=delay', '', PATHS.delay);

    const { constraint } = await resolveEnforcementContext();

    expect(constraint?.id).toBe('cp-1');
    expect(constraint?.behavior).toBe('checkpoint');
  });

  it('a PIN-page URL carrying a different live constraint\'s cid resolves to that exact constraint, never one implied by the page itself', async () => {
    seed([
      makeConstraint('pin-required', { id: 'other-1', domain: 'other.example' }),
      makeConstraint('pin-required', { id: 'unrelated-1', domain: 'unrelated.example' }),
    ]);
    setLocation('?cid=other-1&behavior=pin-required', '', PATHS.pin);

    const { constraint } = await resolveEnforcementContext();

    expect(constraint?.id).toBe('other-1');
    expect(constraint?.domain).toBe('other.example');
  });

  it('an unknown/deleted cid resolves to no constraint at all (safe-exit path, not a phantom render)', async () => {
    seed([makeConstraint('checkpoint', { id: 'exists-1', domain: 'exists.example' })]);
    setLocation('?cid=does-not-exist&behavior=checkpoint', '', PATHS.checkpoint);

    const { constraint } = await resolveEnforcementContext();

    expect(constraint).toBeNull();
  });

  it('falls back to legacy domain= resolution when cid is absent (an already-open, pre-Milestone-7 page across an update)', async () => {
    seed([makeConstraint('checkpoint', { id: 'legacy-1', domain: 'legacy.example' })]);
    setLocation('?domain=legacy.example&behavior=checkpoint', '', PATHS.checkpoint);

    const { constraint } = await resolveEnforcementContext();

    expect(constraint?.id).toBe('legacy-1');
  });

  it('cid takes priority over a simultaneously-present, unrelated domain= param', async () => {
    seed([
      makeConstraint('hard-block', { id: 'real-1', domain: 'real.example', delayMinutes: null }),
      makeConstraint('checkpoint', { id: 'decoy-1', domain: 'decoy.example' }),
    ]);
    setLocation('?cid=real-1&domain=decoy.example&behavior=checkpoint', '', PATHS.checkpoint);

    const { constraint } = await resolveEnforcementContext();

    expect(constraint?.id).toBe('real-1');
    expect(constraint?.domain).toBe('real.example');
  });
});
