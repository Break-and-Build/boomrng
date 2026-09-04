import { describe, it, expect } from 'vitest';
import { DOMAIN_SPECIFICITY_CAP } from '../shared/utils/domain';
import { REDIRECT_PRIORITY_BASE, redirectPriorityForDomain, ALLOWED_SITE_PRIORITY, CONTINUATION_PRIORITY } from './dnr-priority';

describe('redirectPriorityForDomain', () => {
  it('a bare domain (2 labels) gets the base priority — unchanged from the historical flat scheme', () => {
    expect(redirectPriorityForDomain('example.com')).toBe(REDIRECT_PRIORITY_BASE);
  });

  it('a subdomain gets a strictly higher priority than its parent', () => {
    const parent = redirectPriorityForDomain('example.com');
    const child = redirectPriorityForDomain('docs.example.com');
    expect(child).toBeGreaterThan(parent);
  });

  it('a deeper descendant gets a strictly higher priority than its parent subdomain', () => {
    const parent = redirectPriorityForDomain('docs.example.com');
    const child = redirectPriorityForDomain('foo.docs.example.com');
    expect(child).toBeGreaterThan(parent);
  });

  it('priority increases monotonically with label count across several levels', () => {
    const priorities = [
      redirectPriorityForDomain('example.com'),
      redirectPriorityForDomain('a.example.com'),
      redirectPriorityForDomain('b.a.example.com'),
      redirectPriorityForDomain('c.b.a.example.com'),
    ];
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThan(priorities[i - 1]);
    }
  });

  it('clamps at a fixed ceiling for a pathologically deep domain — never grows unbounded', () => {
    const deepLabels = Array.from({ length: 40 }, (_, i) => `l${i}`).join('.');
    const veryDeep = `${deepLabels}.example.com`;
    const atCap = 'a.'.repeat(DOMAIN_SPECIFICITY_CAP) + 'example.com';

    const priority = redirectPriorityForDomain(veryDeep);
    expect(priority).toBeLessThan(ALLOWED_SITE_PRIORITY);
    // Beyond the cap, additional depth no longer increases priority —
    // this is the documented, accepted limit, not an unbounded value.
    expect(priority).toBe(redirectPriorityForDomain(atCap));
  });

  it('an invalid domain resolves to the base priority rather than throwing', () => {
    expect(redirectPriorityForDomain('not a domain')).toBe(REDIRECT_PRIORITY_BASE);
  });
});

describe('bounded priority invariants', () => {
  it('ALLOWED_SITE_PRIORITY is strictly above every possible redirect priority, including at the specificity cap', () => {
    const deepLabels = Array.from({ length: 50 }, (_, i) => `l${i}`).join('.');
    const maxRedirectPriority = redirectPriorityForDomain(`${deepLabels}.example.com`);
    expect(ALLOWED_SITE_PRIORITY).toBeGreaterThan(maxRedirectPriority);
  });

  it('CONTINUATION_PRIORITY is strictly above ALLOWED_SITE_PRIORITY, and therefore above every possible redirect priority too', () => {
    expect(CONTINUATION_PRIORITY).toBeGreaterThan(ALLOWED_SITE_PRIORITY);
  });

  it('CONTINUATION_PRIORITY is strictly above every possible redirect priority directly, not only transitively', () => {
    const deepLabels = Array.from({ length: 50 }, (_, i) => `l${i}`).join('.');
    const maxRedirectPriority = redirectPriorityForDomain(`${deepLabels}.example.com`);
    expect(CONTINUATION_PRIORITY).toBeGreaterThan(maxRedirectPriority);
  });
});
