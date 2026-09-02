import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeMock, uninstallChromeMock } from '../testing/chrome-mock';
import { findMatchingConstraint, loadEnforcementContext } from './enforcement-context-service';
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
