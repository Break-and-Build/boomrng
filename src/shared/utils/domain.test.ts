import { describe, it, expect } from 'vitest';
import { normalizeDomain } from './domain';

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
