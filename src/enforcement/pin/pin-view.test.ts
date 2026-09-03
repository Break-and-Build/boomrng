import { describe, it, expect } from 'vitest';
import { buildPinView, isSubmittablePin, shouldAutoSubmit, PIN_MAX_LENGTH } from './pin-view';
import type { Constraint } from '../../shared/types/constraint';

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    domain: 'instagram.com',
    behavior: 'pin-required',
    delayMinutes: null,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

describe('buildPinView — public constraint, PIN configured', () => {
  it('shows the domain chip and offers normal verification', () => {
    const view = buildPinView('instagram.com', makeConstraint(), '1234');
    expect(view.showDomain).toBe(true);
    expect(view.showUnavailable).toBe(false);
  });
});

describe('buildPinView — private constraint, PIN configured', () => {
  it('never shows the domain chip, still offers normal verification', () => {
    const view = buildPinView('instagram.com', makeConstraint({ isPrivate: true }), '1234');
    expect(view.showDomain).toBe(false);
    expect(view.showUnavailable).toBe(false);
  });
});

describe('buildPinView — missing domain / missing constraint fallback', () => {
  it('withholds the chip when the domain itself is unknown, same precedent as Checkpoint/Delay', () => {
    expect(buildPinView(null, makeConstraint(), '1234').showDomain).toBe(false);
  });

  it('shows the chip when the constraint record is not found but a domain is known (deleted/edited race)', () => {
    expect(buildPinView('instagram.com', null, '1234').showDomain).toBe(true);
  });

  it('never shows the unavailable state when the constraint record is not found — there is no behavior to check, so normal verification is offered rather than a third invented state', () => {
    expect(buildPinView('instagram.com', null, null).showUnavailable).toBe(false);
  });
});

/**
 * LOCKED V2 PRODUCT DECISION (BOOMRNG-V2-DESIGN-SPEC.md §30.3, resolved):
 * a pin-required constraint with no global PIN configured shows a
 * dedicated unavailable state instead of falling through to normal PIN
 * verification (which would incorrectly present as "Incorrect PIN" for a
 * candidate that could never be correct against a null stored PIN).
 */
describe('buildPinView — PIN-required constraint, no global PIN configured (§30.3)', () => {
  it('public: domain chip may still show, but verification is unavailable', () => {
    const view = buildPinView('instagram.com', makeConstraint({ isPrivate: false }), null);
    expect(view.showUnavailable).toBe(true);
    expect(view.showDomain).toBe(true);
  });

  it('private: domain chip stays withheld AND verification is unavailable', () => {
    const view = buildPinView('instagram.com', makeConstraint({ isPrivate: true }), null);
    expect(view.showUnavailable).toBe(true);
    expect(view.showDomain).toBe(false);
  });

  it('is false whenever a PIN IS configured, regardless of its value', () => {
    expect(buildPinView('instagram.com', makeConstraint(), '1234').showUnavailable).toBe(false);
    expect(buildPinView('instagram.com', makeConstraint(), '000000').showUnavailable).toBe(false);
  });

  it('is false for a non-pin-required constraint even with no global PIN — this state is specific to the pin-required behavior', () => {
    const view = buildPinView('instagram.com', makeConstraint({ behavior: 'checkpoint' }), null);
    expect(view.showUnavailable).toBe(false);
  });

  it('empty-string stored PIN is treated the same as null (falsy) — reuses isPinRequiredButNotConfigured\'s own existing contract rather than inventing a new one', () => {
    expect(buildPinView('instagram.com', makeConstraint(), '').showUnavailable).toBe(true);
  });
});

describe('isSubmittablePin — reuses validation-service.ts\'s existing 4-6 digit contract', () => {
  it('accepts 4, 5, and 6 digit PINs', () => {
    expect(isSubmittablePin('1234')).toBe(true);
    expect(isSubmittablePin('12345')).toBe(true);
    expect(isSubmittablePin('123456')).toBe(true);
  });

  it('rejects fewer than 4 digits', () => {
    expect(isSubmittablePin('123')).toBe(false);
  });

  it('rejects more than 6 digits', () => {
    expect(isSubmittablePin('1234567')).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(isSubmittablePin('12a4')).toBe(false);
    expect(isSubmittablePin('')).toBe(false);
  });
});

describe('shouldAutoSubmit — fires only at the exact max length with a valid format', () => {
  it('does not fire before the max length is reached', () => {
    expect(shouldAutoSubmit('1234')).toBe(false);
    expect(shouldAutoSubmit('12345')).toBe(false);
  });

  it('fires the instant the field reaches max length with a valid digit string', () => {
    expect('123456'.length).toBe(PIN_MAX_LENGTH);
    expect(shouldAutoSubmit('123456')).toBe(true);
  });

  it('does NOT fire at max length if the content is not a valid digit string (e.g. a 6-character paste with letters)', () => {
    expect(shouldAutoSubmit('12a456')).toBe(false);
  });
});
