import { describe, it, expect } from 'vitest';
import { isPinProtected, authorizeConstraintMutation } from './pin-recovery-service';
import type { Constraint } from '../types/constraint';

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    domain: 'instagram.com',
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

describe('isPinProtected', () => {
  it('is true for a pin-required constraint, private or not', () => {
    expect(isPinProtected(makeConstraint({ behavior: 'pin-required' }))).toBe(true);
    expect(isPinProtected(makeConstraint({ behavior: 'pin-required', isPrivate: true }))).toBe(true);
  });

  it('is true for a private constraint regardless of behavior', () => {
    expect(isPinProtected(makeConstraint({ isPrivate: true, behavior: 'checkpoint' }))).toBe(true);
    expect(isPinProtected(makeConstraint({ isPrivate: true, behavior: 'hard-block' }))).toBe(true);
  });

  it('is false for a public, non-pin-required constraint', () => {
    expect(isPinProtected(makeConstraint({ behavior: 'checkpoint', isPrivate: false }))).toBe(false);
    expect(isPinProtected(makeConstraint({ behavior: 'hard-block', isPrivate: false }))).toBe(false);
    expect(isPinProtected(makeConstraint({ behavior: 'delay', isPrivate: false }))).toBe(false);
  });
});

/**
 * REGRESSION SUITE for a confirmed gap: Sites.tsx's edit/delete click
 * handlers previously gated only on `constraint.isPrivate`, so a
 * pin-required-but-public constraint could have its behavior changed
 * away from pin-required, or be deleted outright, with no PIN check at
 * all — fully defeating the point of PIN Required without ever knowing
 * the PIN. `authorizeConstraintMutation` is the fix: the one function
 * both handlers now call before proceeding.
 */
describe('authorizeConstraintMutation', () => {
  describe('PIN-protected constraint edit → correct PIN required before mutation', () => {
    it('an empty/no-attempt candidate does not authorize a pin-required constraint', () => {
      const constraint = makeConstraint({ behavior: 'pin-required' });
      expect(authorizeConstraintMutation(constraint, '', '1234')).toBe(false);
    });
  });

  describe('wrong PIN → mutation denied', () => {
    it('denies a pin-required constraint for an incorrect candidate', () => {
      const constraint = makeConstraint({ behavior: 'pin-required' });
      expect(authorizeConstraintMutation(constraint, '0000', '1234')).toBe(false);
    });

    it('denies a private (non-pin-required) constraint for an incorrect candidate', () => {
      const constraint = makeConstraint({ isPrivate: true, behavior: 'checkpoint' });
      expect(authorizeConstraintMutation(constraint, '0000', '1234')).toBe(false);
    });
  });

  describe('correct PIN → mutation allowed', () => {
    it('authorizes a pin-required constraint for the correct candidate', () => {
      const constraint = makeConstraint({ behavior: 'pin-required' });
      expect(authorizeConstraintMutation(constraint, '1234', '1234')).toBe(true);
    });

    it('authorizes a private (non-pin-required) constraint for the correct candidate', () => {
      const constraint = makeConstraint({ isPrivate: true, behavior: 'checkpoint' });
      expect(authorizeConstraintMutation(constraint, '1234', '1234')).toBe(true);
    });

    it('authorizes a constraint that is both private and pin-required for the correct candidate', () => {
      const constraint = makeConstraint({ isPrivate: true, behavior: 'pin-required' });
      expect(authorizeConstraintMutation(constraint, '1234', '1234')).toBe(true);
    });
  });

  describe('public, non-PIN constraints remain editable/deletable without a PIN', () => {
    it('authorizes unconditionally — the candidate is never even inspected', () => {
      const constraint = makeConstraint({ behavior: 'checkpoint', isPrivate: false });
      expect(authorizeConstraintMutation(constraint, '', null)).toBe(true);
      expect(authorizeConstraintMutation(constraint, 'anything', 'wrong-would-not-matter')).toBe(true);
    });

    it('applies the same for delay and hard-block behaviors', () => {
      expect(authorizeConstraintMutation(makeConstraint({ behavior: 'delay' }), '', null)).toBe(true);
      expect(authorizeConstraintMutation(makeConstraint({ behavior: 'hard-block' }), '', null)).toBe(true);
    });
  });

  describe('changing a non-PIN constraint into pin-required does not require the old PIN', () => {
    it('the constraint being edited is evaluated in its CURRENT (pre-edit) state — a currently-checkpoint constraint authorizes freely even though the edit form might change it to pin-required', () => {
      // authorizeConstraintMutation only ever sees the constraint as it is
      // BEFORE the edit (Sites.tsx calls it at click-time, using the
      // stored constraint) — what the user changes it to inside the form
      // is a separate save action already governed by ConstraintForm's
      // own validation rules, untouched by this gate.
      const currentlyCheckpoint = makeConstraint({ behavior: 'checkpoint' });
      expect(authorizeConstraintMutation(currentlyCheckpoint, '', '1234')).toBe(true);
    });
  });

  describe('no PIN configured at all', () => {
    it('a pin-required constraint cannot be authorized by any candidate when no PIN is configured (matches the enforcement page\'s own isPinRequiredButNotConfigured precedent — nothing can ever satisfy a null stored PIN)', () => {
      const constraint = makeConstraint({ behavior: 'pin-required' });
      expect(authorizeConstraintMutation(constraint, '', null)).toBe(false);
      expect(authorizeConstraintMutation(constraint, '1234', null)).toBe(false);
    });
  });
});
