import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mintPinAuthorization, clearPinAuthorization, consumePinAuthorization } from './pin-authorization-service';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('consumePinAuthorization', () => {
  it('succeeds for the exact tab/domain/constraint a mint was just issued for', () => {
    mintPinAuthorization(1, 'example.com', 'c1');
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(true);
  });

  it('fails when nothing was ever minted for that tab', () => {
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(false);
  });

  it('is one-shot: a second consumption attempt for the same tab fails, even immediately after a successful one', () => {
    mintPinAuthorization(1, 'example.com', 'c1');
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(true);
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(false);
  });

  it('a mismatched domain fails, and also consumes/invalidates the entry (one-shot applies to any attempt, not just matching ones)', () => {
    mintPinAuthorization(1, 'example.com', 'c1');
    expect(consumePinAuthorization(1, 'other.com', 'c1')).toBe(false);
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(false);
  });

  it('a mismatched constraintId fails', () => {
    mintPinAuthorization(1, 'example.com', 'c1');
    expect(consumePinAuthorization(1, 'example.com', 'c2')).toBe(false);
  });

  it('a mismatched tabId fails — an authorization for tab 1 is invisible to tab 2', () => {
    mintPinAuthorization(1, 'example.com', 'c1');
    expect(consumePinAuthorization(2, 'example.com', 'c1')).toBe(false);
    // And the original tab's own authorization is untouched by the miss on tab 2.
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(true);
  });

  it('expires after its TTL — a correct match past expiry still fails', () => {
    mintPinAuthorization(1, 'example.com', 'c1');
    vi.advanceTimersByTime(10_001);
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(false);
  });

  it('a fresh mint for the same tab replaces any previous pending authorization outright', () => {
    mintPinAuthorization(1, 'a.com', 'c1');
    mintPinAuthorization(1, 'b.com', 'c2');
    // The a.com/c1 authorization is gone the instant b.com/c2 was minted
    // — only the latest one for this tab is ever consumable.
    expect(consumePinAuthorization(1, 'b.com', 'c2')).toBe(true);
  });
});

describe('clearPinAuthorization', () => {
  it('removes a pending authorization outright — simulates a wrong PIN attempt invalidating an earlier success', () => {
    mintPinAuthorization(1, 'example.com', 'c1');
    clearPinAuthorization(1);
    expect(consumePinAuthorization(1, 'example.com', 'c1')).toBe(false);
  });

  it('is safe to call when nothing is pending', () => {
    expect(() => clearPinAuthorization(1)).not.toThrow();
  });
});
