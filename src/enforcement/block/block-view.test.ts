import { describe, it, expect } from 'vitest';
import { buildBlockView } from './block-view';
import type { Constraint } from '../../shared/types/constraint';

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    domain: 'tiktok.com',
    behavior: 'hard-block',
    delayMinutes: null,
    schedule: null,
    customMessage: null,
    createdAt: Date.now(),
    progressiveDelay: null,
    isPrivate: false,
    ...overrides,
  };
}

describe('buildBlockView — public constraint', () => {
  it('shows the domain chip', () => {
    expect(buildBlockView('tiktok.com', makeConstraint()).showDomain).toBe(true);
  });
});

describe('buildBlockView — private constraint', () => {
  it('never shows the domain chip, even though a domain is known', () => {
    expect(buildBlockView('tiktok.com', makeConstraint({ isPrivate: true })).showDomain).toBe(false);
  });
});

describe('buildBlockView — missing domain / missing constraint fallback', () => {
  it('withholds the chip when the domain itself is unknown, same precedent as every other enforcement page', () => {
    expect(buildBlockView(null, makeConstraint()).showDomain).toBe(false);
  });

  it('shows the chip when the constraint record is not found but a domain is known (deleted/edited race) — defensive only, reconcileStaleEnforcementPage already redirects away before this is reached with a null constraint in practice', () => {
    expect(buildBlockView('tiktok.com', null).showDomain).toBe(true);
  });
});

describe('buildBlockView — behavior is irrelevant to the view (headline never varies)', () => {
  it('returns the same showDomain regardless of the constraint\'s own behavior field', () => {
    expect(buildBlockView('tiktok.com', makeConstraint({ behavior: 'hard-block' })).showDomain).toBe(true);
    // Reconciliation guarantees this page only ever sees a live hard-block
    // constraint, but buildBlockView itself doesn't need to assume that —
    // its logic depends only on domain/isPrivate either way.
    expect(buildBlockView('tiktok.com', makeConstraint({ behavior: 'checkpoint' })).showDomain).toBe(true);
  });
});
