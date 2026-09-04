import { describe, it, expect } from 'vitest';
import { normalizeDomain, isHostUnderConstraintDomain } from './domain';

describe('normalizeDomain', () => {
  it('lowercases the input', () => {
    expect(normalizeDomain('Example.COM')).toBe('example.com');
  });

  it('strips a leading www.', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com');
  });

  it('strips http:// and https:// schemes', () => {
    expect(normalizeDomain('http://example.com')).toBe('example.com');
    expect(normalizeDomain('https://example.com')).toBe('example.com');
  });

  it('combines scheme, www, and case normalization into the same effective domain', () => {
    expect(normalizeDomain('https://WWW.Example.com')).toBe(normalizeDomain('example.com'));
  });

  it('rejects a single-label host with no TLD (e.g. localhost)', () => {
    expect(normalizeDomain('localhost')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(normalizeDomain('')).toBeNull();
  });

  it('rejects input containing whitespace', () => {
    expect(normalizeDomain('example .com')).toBeNull();
  });

  it('rejects a domain with a path — this function identifies a host, not a URL', () => {
    expect(normalizeDomain('example.com/path')).toBeNull();
  });

  it('accepts a domain with hyphens and subdomains', () => {
    expect(normalizeDomain('my-sub.example.co.uk')).toBe('my-sub.example.co.uk');
  });
});

/**
 * One-way, self-or-descendant only — must agree exactly with what
 * `buildBlockedSiteRegexFilter()` (rules-builder.ts) actually intercepts
 * at the DNR layer. Regression coverage for a confirmed discrepancy: the
 * separate, bidirectional `isDomainMatch()` incorrectly matched a
 * constraint's parent domain too (e.g. constraint `docs.example.com`
 * "matching" a plain visit to `example.com`, which DNR never redirects)
 * — this function exists specifically because that's unsafe wherever
 * agreement with DNR's own matching is required.
 */
describe('isHostUnderConstraintDomain', () => {
  it('matches the constraint domain itself', () => {
    expect(isHostUnderConstraintDomain('example.com', 'example.com')).toBe(true);
  });

  it('a parent constraint matches a child (subdomain) host', () => {
    expect(isHostUnderConstraintDomain('example.com', 'docs.example.com')).toBe(true);
  });

  it('a child (subdomain) constraint does NOT match its own parent host — the discrepancy this function fixes', () => {
    expect(isHostUnderConstraintDomain('docs.example.com', 'example.com')).toBe(false);
  });

  it('a child (subdomain) constraint does NOT match a sibling host', () => {
    expect(isHostUnderConstraintDomain('docs.example.com', 'other.example.com')).toBe(false);
  });

  it('a child (subdomain) constraint matches a deeper child of itself', () => {
    expect(isHostUnderConstraintDomain('docs.example.com', 'foo.docs.example.com')).toBe(true);
  });

  it('does not match an unrelated domain that merely contains the constraint as a substring', () => {
    expect(isHostUnderConstraintDomain('example.com', 'notexample.com')).toBe(false);
    expect(isHostUnderConstraintDomain('example.com', 'example.com.evil.com')).toBe(false);
  });

  it('returns false for input that fails to normalize', () => {
    expect(isHostUnderConstraintDomain('', 'example.com')).toBe(false);
    expect(isHostUnderConstraintDomain('example.com', '')).toBe(false);
  });
});
