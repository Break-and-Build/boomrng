// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { computeOriginalUrlBootstrapAction, ORIGINAL_URL_STORAGE_KEY } from './utils';

/**
 * CSP-repair regression coverage (BOOMRNG-V2-DESIGN-SPEC.md §30.7): the
 * original inline bootstrap silently never ran in real Chrome at all —
 * MV3's extension-page CSP (`script-src 'self'`) has never permitted
 * inline script execution — which vitest's own suite had no way to catch,
 * since it only ever exercised the canonical TS spec
 * (`computeOriginalUrlBootstrapAction`), never the raw duplicated script
 * that actually shipped. `public/enforcement-bootstrap.js` replaces the
 * four inline copies with one external, CSP-compliant file; this test
 * executes that *actual* file's real source (not a re-typed copy of it)
 * against the same canonical spec, so any future drift between the two
 * is caught here instead of silently shipping again.
 */

const BOOTSTRAP_PATH = resolve(__dirname, '../../../public/enforcement-bootstrap.js');
const bootstrapSource = readFileSync(BOOTSTRAP_PATH, 'utf-8');
const SENTINEL = 'https://previous.example/should-not-survive-unless-noop';

function runBootstrap(): void {
  // The file is a self-contained classic-script IIFE with no imports and
  // no module boundary (by design — it must run before any module code
  // exists) — `new Function` executes it exactly as a `<script src>` tag
  // would, against the real jsdom `window`/`sessionStorage`/`history`.
  new Function(bootstrapSource)();
}

function setLocation(hash: string): void {
  window.history.replaceState(null, '', '/dist/src/enforcement/checkpoint/index.html' + hash);
}

describe('enforcement-bootstrap.js — the real shipped file, checked against the canonical spec', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  const cases: { name: string; hash: string }[] = [
    { name: 'a valid https URL', hash: '#https://example.com/watch?v=1' },
    { name: 'a valid http URL', hash: '#http://example.com/' },
    { name: 'an invalid scheme (javascript:)', hash: '#javascript:alert(1)' },
    { name: 'malformed URL text', hash: '#not a url' },
    { name: 'a percent-encoded valid URL', hash: '#' + encodeURIComponent('https://example.com/a b') },
    { name: 'no hash at all', hash: '' },
  ];

  for (const { name, hash } of cases) {
    it(`for ${name}: matches computeOriginalUrlBootstrapAction's decision and always strips the fragment`, () => {
      window.sessionStorage.setItem(ORIGINAL_URL_STORAGE_KEY, SENTINEL);
      setLocation(hash);

      const expected = computeOriginalUrlBootstrapAction(hash || null);

      runBootstrap();

      const stored = window.sessionStorage.getItem(ORIGINAL_URL_STORAGE_KEY);
      if (expected.type === 'store') {
        expect(stored).toBe(expected.value);
      } else if (expected.type === 'clear') {
        expect(stored).toBeNull();
      } else {
        // noop — an existing stored value must survive untouched.
        expect(stored).toBe(SENTINEL);
      }

      // The literal symptom from the CSP defect: the fragment must never
      // remain in the visible URL once this has run, regardless of which
      // branch above fired.
      expect(window.location.hash).toBe('');
    });
  }

  it('does not throw when sessionStorage/history are unavailable (matches the try/catch guards in the canonical spec)', () => {
    setLocation('#https://example.com/');
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new Error('sessionStorage unavailable');
      },
      configurable: true,
    });
    try {
      expect(runBootstrap).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'sessionStorage', original);
    }
  });
});
