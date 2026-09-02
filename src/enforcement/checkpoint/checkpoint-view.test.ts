import { describe, it, expect } from 'vitest';
import { buildCheckpointView } from './checkpoint-view';
import type { Constraint } from '../../shared/types/constraint';

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
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

describe('buildCheckpointView — normal constraint', () => {
  it('names the domain in the headline and the continue label', () => {
    const view = buildCheckpointView('twitter.com', makeConstraint());
    expect(view.showDomain).toBe(true);
    expect(view.headline).toBe('You were heading to twitter.com.');
    expect(view.continueLabel).toBe('Continue to twitter.com anyway');
  });

  it('surfaces a personal reason verbatim when one is set', () => {
    const view = buildCheckpointView('twitter.com', makeConstraint({ customMessage: "I said I'd write, not scroll." }));
    expect(view.reason).toBe("I said I'd write, not scroll.");
  });

  it('has no reason when none was set', () => {
    const view = buildCheckpointView('twitter.com', makeConstraint({ customMessage: null }));
    expect(view.reason).toBeNull();
  });

  it('falls back to the domain-generic copy when no matching constraint is found (e.g. deleted/edited after the DNR rule redirected here)', () => {
    const view = buildCheckpointView('twitter.com', null);
    // No isPrivate signal is available at all in this case, but a domain
    // *is* known — the missing-domain fallback and the private fallback
    // share their generic copy (see buildCheckpointView's own doc
    // comment), yet a known domain from a still-live redirect should not
    // be hidden just because its constraint record momentarily 404s.
    expect(view.showDomain).toBe(true);
    expect(view.headline).toBe('You were heading to twitter.com.');
  });
});

describe('buildCheckpointView — private constraint', () => {
  it('never names the domain in the headline or continue label', () => {
    const view = buildCheckpointView('twitter.com', makeConstraint({ isPrivate: true }));
    expect(view.showDomain).toBe(false);
    expect(view.headline).toBe('This site is constrained.');
    expect(view.continueLabel).toBe('Continue anyway');
    expect(view.headline).not.toContain('twitter.com');
    expect(view.continueLabel).not.toContain('twitter.com');
  });

  it('withholds the personal reason even when one is set — reason is exactly as identifying as the domain (§26)', () => {
    const view = buildCheckpointView('twitter.com', makeConstraint({ isPrivate: true, customMessage: 'stop checking dating profiles' }));
    expect(view.reason).toBeNull();
  });
});

describe('buildCheckpointView — missing domain', () => {
  it('falls back to the same domain-generic copy private constraints use, since there is nothing safe to name', () => {
    const view = buildCheckpointView(null, makeConstraint());
    expect(view.showDomain).toBe(false);
    expect(view.headline).toBe('This site is constrained.');
    expect(view.continueLabel).toBe('Continue anyway');
  });

  it('still surfaces a public constraint\'s reason even when the domain itself is unavailable — reason suppression is tied to isPrivate, not to whether a domain happens to be known', () => {
    const view = buildCheckpointView(null, makeConstraint({ customMessage: 'stop scrolling' }));
    expect(view.reason).toBe('stop scrolling');
  });
});
