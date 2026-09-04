import { describe, it, expect, beforeAll } from 'vitest';
import { installChromeMock } from '../shared/testing/chrome-mock';
import { generateRules, buildBlockedSiteRegexFilter, buildRedirectSubstitution } from './rules-builder';

// `generateRules` reads `chrome.declarativeNetRequest`'s enum constants
// directly (not just their string values), so the mock needs to be
// installed before this module's functions run.
beforeAll(() => {
  installChromeMock();
});

const EXT_ID = 'testextensionid0000000000000000';

describe('buildBlockedSiteRegexFilter', () => {
  const filter = buildBlockedSiteRegexFilter('example.com');
  const regex = new RegExp(filter);

  it('matches the bare host over https and http', () => {
    expect(regex.test('https://example.com')).toBe(true);
    expect(regex.test('http://example.com')).toBe(true);
  });

  it('matches any subdomain', () => {
    expect(regex.test('https://sub.example.com')).toBe(true);
    expect(regex.test('https://deep.sub.example.com')).toBe(true);
  });

  it('matches with a path, query string, and/or hash', () => {
    expect(regex.test('https://example.com/watch?v=abc&list=xyz')).toBe(true);
    expect(regex.test('https://example.com/path#section')).toBe(true);
  });

  it('matches with an explicit port', () => {
    expect(regex.test('https://example.com:8443/path')).toBe(true);
  });

  it('does not match an unrelated domain that merely contains the host as a substring', () => {
    expect(regex.test('https://notexample.com')).toBe(false);
    expect(regex.test('https://example.com.evil.com')).toBe(false);
  });

  it('does not match a different domain entirely', () => {
    expect(regex.test('https://other.com')).toBe(false);
  });

  it('escapes regex metacharacters in the host so they are not treated as regex syntax', () => {
    // A host containing characters normalizeDomain() would never actually
    // produce, exercised directly against the builder for robustness.
    const weirdFilter = buildBlockedSiteRegexFilter('ex.ample+co.de');
    const weirdRegex = new RegExp(weirdFilter);
    expect(weirdRegex.test('https://ex.ample+co.de')).toBe(true);
    expect(weirdRegex.test('https://exXampleXcode')).toBe(false);
  });
});

describe('buildRedirectSubstitution', () => {
  it('produces exactly cid and behavior, with no fragment and no destination of any kind (BOOMRNG-V2-DESIGN-SPEC.md §30.7)', () => {
    const substitution = buildRedirectSubstitution(EXT_ID, 'src/enforcement/checkpoint/index.html', 'c1', 'checkpoint');
    expect(substitution).toBe(`chrome-extension://${EXT_ID}/dist/src/enforcement/checkpoint/index.html?cid=c1&behavior=checkpoint`);
  });

  it('never contains a "#" fragment — the confirmed real-Chrome History-disclosure mechanism this replaces', () => {
    const substitution = buildRedirectSubstitution(EXT_ID, 'src/enforcement/checkpoint/index.html', 'c1', 'checkpoint');
    expect(substitution).not.toContain('#');
    expect(substitution).not.toContain('\\0');
  });

  it('percent-encodes the constraint id and behavior query values', () => {
    const substitution = buildRedirectSubstitution(EXT_ID, 'src/enforcement/pin/index.html', 'id with spaces', 'pin-required');
    expect(substitution).toContain(`cid=${encodeURIComponent('id with spaces')}`);
    expect(substitution).toContain('behavior=pin-required');
  });

  it('never places the domain anywhere in the redirect target (BOOMRNG-V2-DESIGN-SPEC.md §30.7)', () => {
    const substitution = buildRedirectSubstitution(EXT_ID, 'src/enforcement/checkpoint/index.html', 'c1', 'checkpoint');
    expect(substitution).not.toContain('domain=');
  });
});

describe('generateRules', () => {
  it('generates exactly one REDIRECT rule per blocked domain, using regexFilter/regexSubstitution', () => {
    const rules = generateRules([{ url: 'example.com', behavior: 'checkpoint', id: 'c1' }], [], EXT_ID);
    const redirectRules = rules.filter((r) => r.action.type === 'redirect');
    expect(redirectRules).toHaveLength(1);
    expect(redirectRules[0].condition.urlFilter).toBeUndefined();
    expect(redirectRules[0].condition.regexFilter).toBe(buildBlockedSiteRegexFilter('example.com'));
    expect(redirectRules[0].action.redirect?.url).toBeUndefined();
    expect(redirectRules[0].action.redirect?.regexSubstitution).toContain('cid=c1');
    expect(redirectRules[0].action.redirect?.regexSubstitution).toContain('behavior=checkpoint');
    expect(redirectRules[0].action.redirect?.regexSubstitution).not.toContain('#');
  });

  it('routes each behavior to its own enforcement page', () => {
    const rules = generateRules(
      [
        { url: 'a.com', behavior: 'checkpoint', id: 'id-a' },
        { url: 'b.com', behavior: 'delay', id: 'id-b' },
        { url: 'c.com', behavior: 'pin-required', id: 'id-c' },
        { url: 'd.com', behavior: 'hard-block', id: 'id-d' },
      ],
      [],
      EXT_ID
    );
    const pageFor = (cid: string) =>
      rules.find((r) => r.action.redirect?.regexSubstitution?.includes(`cid=${cid}`))?.action.redirect
        ?.regexSubstitution;

    expect(pageFor('id-a')).toContain('/enforcement/checkpoint/');
    expect(pageFor('id-b')).toContain('/enforcement/delay/');
    expect(pageFor('id-c')).toContain('/enforcement/pin/');
    expect(pageFor('id-d')).toContain('/enforcement/block/');
  });

  it('normalizes domains before keying rules, so www./https:// variants collapse to one rule', () => {
    const rules = generateRules([{ url: 'https://www.example.com', behavior: 'checkpoint', id: 'c1' }], [], EXT_ID);
    const redirectRules = rules.filter((r) => r.action.type === 'redirect');
    expect(redirectRules).toHaveLength(1);
    expect(redirectRules[0].condition.regexFilter).toBe(buildBlockedSiteRegexFilter('example.com'));
    expect(redirectRules[0].action.redirect?.regexSubstitution).toContain('cid=c1');
  });

  it('still generates an ALLOW rule for a single-label allowed site (e.g. the default "localhost")', () => {
    const rules = generateRules([], ['localhost'], EXT_ID);
    const allowRules = rules.filter((r) => r.action.type === 'allow');
    expect(allowRules).toHaveLength(1);
    expect(allowRules[0].condition.urlFilter).toBe('||localhost');
  });

  it('excludes a blocked constraint domain that is also in the allow list', () => {
    const rules = generateRules([{ url: 'example.com', behavior: 'checkpoint', id: 'c1' }], ['example.com'], EXT_ID);
    const redirectRules = rules.filter((r) => r.action.type === 'redirect');
    expect(redirectRules).toHaveLength(0);
  });

  it('two constraints colliding on the same effective domain produce exactly one rule (defensive fallback, not a policy)', () => {
    const rules = generateRules(
      [
        { url: 'example.com', behavior: 'checkpoint', id: 'c1' },
        { url: 'www.example.com', behavior: 'hard-block', id: 'c2' },
      ],
      [],
      EXT_ID
    );
    const redirectRules = rules.filter((r) => r.action.type === 'redirect');
    // Exactly one DNR rule results — never two conflicting rules for one
    // domain. Which behavior "won" is deliberately not asserted here: per
    // BOOMRNG-V2-DESIGN-SPEC.md §30.2, this fallback's outcome is
    // unspecified, and a test asserting a specific winner would itself be
    // inventing the precedence rule the spec says not to invent.
    expect(redirectRules).toHaveLength(1);
  });

  it('produces no rules at all when there are no blocked or allowed sites', () => {
    expect(generateRules([], [], EXT_ID)).toHaveLength(0);
  });

  it('skips a blocked site whose domain fails to normalize', () => {
    const rules = generateRules([{ url: 'not a domain', behavior: 'checkpoint', id: 'c1' }], [], EXT_ID);
    expect(rules.filter((r) => r.action.type === 'redirect')).toHaveLength(0);
  });

  describe('characterization: the redirect rule matches its own "Continue" destination', () => {
    // Documents a real, confirmed finding, not a bug in this function: a
    // DNR rule generated here has no built-in expiry or one-shot
    // semantics — it persists and matches every qualifying request for as
    // long as the constraint exists. "Continue to [destination] anyway"
    // (Checkpoint/Delay) and a successful PIN check both navigate to
    // exactly the kind of URL this rule matches, so — with no separate
    // bypass mechanism, which nothing in this codebase currently
    // implements — that navigation is itself re-caught by the same rule
    // and redirected straight back to the enforcement page. This was
    // confirmed live in a real browser (a server issuing a persistent
    // redirect, structurally analogous to this property of DNR) as the
    // likely explanation for a real "clicking Continue does nothing"
    // report. Building an actual bypass is an explicit, separate product
    // decision (BOOMRNG-V2-DESIGN-SPEC.md §30 follow-up) — this test only
    // pins down the fact that motivates it, so it can't silently stop
    // being true without a test noticing.
    it('the same rule matches the exact URL that "Continue" would navigate to', () => {
      const rules = generateRules([{ url: 'facebook.com', behavior: 'checkpoint', id: 'c1' }], [], EXT_ID);
      const redirectRule = rules.find((r) => r.action.type === 'redirect');
      expect(redirectRule).toBeDefined();

      const regex = new RegExp(redirectRule!.condition.regexFilter!);
      // The exact original-destination shape a real report reproduced.
      expect(regex.test('https://www.facebook.com/')).toBe(true);
      // Also matches whatever a downstream server-side redirect from that
      // destination might itself land on, for the same host.
      expect(regex.test('https://web.facebook.com/?_rdc=1&_rdr')).toBe(true);
    });

    it('remains true for a subdomain-qualified constraint too', () => {
      const rules = generateRules([{ url: 'reddit.com', behavior: 'delay', id: 'c1' }], [], EXT_ID);
      const redirectRule = rules.find((r) => r.action.type === 'redirect');
      const regex = new RegExp(redirectRule!.condition.regexFilter!);
      expect(regex.test('https://old.reddit.com/r/anything')).toBe(true);
    });
  });
});
