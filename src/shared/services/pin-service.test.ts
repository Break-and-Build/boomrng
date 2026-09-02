import { describe, it, expect } from 'vitest';
import { verifyPin, isPinRequiredButNotConfigured } from './pin-service';

describe('verifyPin', () => {
  it('returns true when the candidate exactly matches the stored PIN', () => {
    expect(verifyPin('1234', '1234')).toBe(true);
  });

  it('returns false when the candidate does not match', () => {
    expect(verifyPin('4321', '1234')).toBe(false);
  });

  it('returns false when no PIN is configured, regardless of candidate', () => {
    expect(verifyPin('1234', null)).toBe(false);
  });

  it('never treats an empty candidate as matching a null stored PIN', () => {
    expect(verifyPin('', null)).toBe(false);
  });

  it('does not loosely-match differing types of "empty"', () => {
    expect(verifyPin('0000', null)).toBe(false);
  });
});

describe('isPinRequiredButNotConfigured', () => {
  it('is true for a pin-required constraint with no PIN set', () => {
    expect(isPinRequiredButNotConfigured('pin-required', null)).toBe(true);
  });

  it('is false for a pin-required constraint once a PIN is set', () => {
    expect(isPinRequiredButNotConfigured('pin-required', '1234')).toBe(false);
  });

  it('is false for any other behavior, with or without a PIN', () => {
    expect(isPinRequiredButNotConfigured('checkpoint', null)).toBe(false);
    expect(isPinRequiredButNotConfigured('hard-block', null)).toBe(false);
    expect(isPinRequiredButNotConfigured('delay', '1234')).toBe(false);
  });
});
