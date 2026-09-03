import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeMock, uninstallChromeMock } from '../testing/chrome-mock';
import { findMatchingConstraint, loadEnforcementContext, findConstraintById, loadEnforcementContextById } from './enforcement-context-service';
import type { Constraint } from '../types/constraint';

function makeConstraint(overrides: Partial<Constraint>): Constraint {
  return {
    id: 'c1',
    domain: 'example.com',
    behavior: 'checkpoint',
    delayMinutes: null,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

describe('findMatchingConstraint', () => {
  it('finds a constraint by exact domain match', () => {
    const constraints = [makeConstraint({ id: 'a', domain: 'example.com' })];
    expect(findMatchingConstraint('example.com', constraints)?.id).toBe('a');
  });

  it('matches across www./scheme variants via normalization on both sides', () => {
    const constraints = [makeConstraint({ id: 'a', domain: 'www.example.com' })];
    expect(findMatchingConstraint('example.com', constraints)?.id).toBe('a');
    expect(findMatchingConstraint('https://example.com', constraints)?.id).toBe('a');
  });

  it('returns null when nothing matches', () => {
    const constraints = [makeConstraint({ id: 'a', domain: 'example.com' })];
    expect(findMatchingConstraint('other.com', constraints)).toBeNull();
  });

  it('returns null for a null domain', () => {
    const constraints = [makeConstraint({ id: 'a', domain: 'example.com' })];
    expect(findMatchingConstraint(null, constraints)).toBeNull();
  });

  it('returns null when the constraint list is empty', () => {
    expect(findMatchingConstraint('example.com', [])).toBeNull();
  });

  it('carries isPrivate, customMessage, delayMinutes, and behavior through on the match', () => {
    const constraints = [
      makeConstraint({
        id: 'a',
        domain: 'example.com',
        behavior: 'delay',
        delayMinutes: 15,
        customMessage: 'stop scrolling',
        isPrivate: true,
      }),
    ];
    const match = findMatchingConstraint('example.com', constraints);
    expect(match).toMatchObject({
      behavior: 'delay',
      delayMinutes: 15,
      customMessage: 'stop scrolling',
      isPrivate: true,
    });
  });
});

describe('loadEnforcementContext', () => {
  beforeEach(() => {
    uninstallChromeMock();
  });

  it('loads the matching constraint and current settings live from storage', async () => {
    installChromeMock({
      constraints: [makeConstraint({ id: 'a', domain: 'example.com', isPrivate: true })],
      settings: { pin: '1234', tabBudget: 10, landingPage: '', allowedSites: [], schemaVersion: 1 },
    });

    const context = await loadEnforcementContext('example.com');
    expect(context.constraint?.id).toBe('a');
    expect(context.constraint?.isPrivate).toBe(true);
    expect(context.settings.pin).toBe('1234');
  });

  it('reflects the current settings.pin, not a value cached at some earlier point', async () => {
    installChromeMock({
      constraints: [makeConstraint({ id: 'a', domain: 'example.com', behavior: 'pin-required' })],
      settings: { pin: null, tabBudget: 10, landingPage: '', allowedSites: [], schemaVersion: 1 },
    });

    const context = await loadEnforcementContext('example.com');
    expect(context.constraint?.behavior).toBe('pin-required');
    expect(context.settings.pin).toBeNull();
  });

  it('returns a null constraint when nothing in storage matches', async () => {
    installChromeMock({ constraints: [], settings: { pin: null, tabBudget: 10, landingPage: '', allowedSites: [], schemaVersion: 1 } });
    const context = await loadEnforcementContext('example.com');
    expect(context.constraint).toBeNull();
  });
});

/**
 * BOOMRNG-V2-DESIGN-SPEC.md §30.7's id-based counterpart to
 * `findMatchingConstraint()`/`loadEnforcementContext()` — an exact
 * match, deliberately no normalization step at all, since a constraint's
 * own `id` has no notion of "equivalent variants" the way a domain does.
 */
describe('findConstraintById', () => {
  it('finds a constraint by exact id match', () => {
    const constraints = [makeConstraint({ id: 'a', domain: 'example.com' })];
    expect(findConstraintById('a', constraints)?.domain).toBe('example.com');
  });

  it('returns null when nothing matches', () => {
    const constraints = [makeConstraint({ id: 'a' })];
    expect(findConstraintById('does-not-exist', constraints)).toBeNull();
  });

  it('returns null for a null id', () => {
    const constraints = [makeConstraint({ id: 'a' })];
    expect(findConstraintById(null, constraints)).toBeNull();
  });

  it('returns null when the constraint list is empty', () => {
    expect(findConstraintById('a', [])).toBeNull();
  });

  it('a domain that happens to look like an id is never matched — ids and domains are never compared against each other', () => {
    const constraints = [makeConstraint({ id: 'a', domain: 'other.example' })];
    expect(findConstraintById('other.example', constraints)).toBeNull();
  });
});

describe('loadEnforcementContextById', () => {
  beforeEach(() => {
    uninstallChromeMock();
  });

  it('loads the matching constraint and current settings live from storage', async () => {
    installChromeMock({
      constraints: [makeConstraint({ id: 'a', domain: 'example.com', isPrivate: true })],
      settings: { pin: '1234', tabBudget: 10, landingPage: '', allowedSites: [], schemaVersion: 1 },
    });

    const context = await loadEnforcementContextById('a');
    expect(context.constraint?.domain).toBe('example.com');
    expect(context.constraint?.isPrivate).toBe(true);
    expect(context.settings.pin).toBe('1234');
  });

  it('returns a null constraint when the id does not exist (deleted/unknown cid)', async () => {
    installChromeMock({
      constraints: [makeConstraint({ id: 'a', domain: 'example.com' })],
      settings: { pin: null, tabBudget: 10, landingPage: '', allowedSites: [], schemaVersion: 1 },
    });

    const context = await loadEnforcementContextById('does-not-exist');
    expect(context.constraint).toBeNull();
  });
});
