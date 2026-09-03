import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * A direct, literal regression guard for the CSP defect itself
 * (BOOMRNG-V2-DESIGN-SPEC.md §30.7 CSP repair): the bug was exactly
 * "an enforcement page's HTML contains an inline bootstrap script,"
 * which Chrome's extension-page CSP silently refuses to execute. This
 * asserts the source HTML no longer contains that inline copy and does
 * reference the external, CSP-compliant file — for all four pages that
 * need it.
 */

const ENFORCEMENT_PAGES_WITH_BOOTSTRAP = ['checkpoint', 'delay', 'pin', 'block'] as const;

function readEnforcementHtml(page: string): string {
  return readFileSync(resolve(__dirname, `../../enforcement/${page}/index.html`), 'utf-8');
}

describe('enforcement page HTML — external bootstrap reference only, no inline copy', () => {
  for (const page of ENFORCEMENT_PAGES_WITH_BOOTSTRAP) {
    it(`${page}/index.html references the external bootstrap script`, () => {
      const html = readEnforcementHtml(page);
      expect(html).toMatch(/<script\s+src="\.\.\/\.\.\/\.\.\/enforcement-bootstrap\.js">\s*<\/script>/);
    });

    it(`${page}/index.html does not retain the old inline bootstrap`, () => {
      const html = readEnforcementHtml(page);
      expect(html).not.toContain('boomrng_original_url');
      // The old inline version's own IIFE body — a slightly stronger
      // check than the storage-key string alone, in case only part of
      // it were ever accidentally reintroduced.
      expect(html).not.toMatch(/<script>\s*\(function\s*\(\)\s*\{/);
    });
  }

  it('tabbudget/index.html never had the bootstrap and still does not', () => {
    const html = readFileSync(resolve(__dirname, '../../enforcement/tabbudget/index.html'), 'utf-8');
    expect(html).not.toContain('boomrng_original_url');
    expect(html).not.toContain('enforcement-bootstrap.js');
  });
});
