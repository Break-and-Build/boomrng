import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeMock, uninstallChromeMock } from '../testing/chrome-mock';
import { loadConstraints } from './storage-service';
import type { Constraint } from '../types/constraint';

function makeStoredConstraint(overrides: Partial<Constraint>): Constraint {
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

describe('loadConstraints — domain normalization on load', () => {
  beforeEach(() => {
    uninstallChromeMock();
  });

  it('canonicalizes a legacy-stored domain (mixed case, www., scheme) on load', async () => {
    installChromeMock({ constraints: [makeStoredConstraint({ domain: 'https://WWW.Example.com' })] });
    const constraints = await loadConstraints();
    expect(constraints[0].domain).toBe('example.com');
  });

  it('leaves an already-canonical domain unchanged', async () => {
    installChromeMock({ constraints: [makeStoredConstraint({ domain: 'example.com' })] });
    const constraints = await loadConstraints();
    expect(constraints[0].domain).toBe('example.com');
  });

  it('does not discard a constraint whose stored domain fails to normalize — keeps the original string rather than losing data', async () => {
    installChromeMock({ constraints: [makeStoredConstraint({ domain: 'not a domain' })] });
    const constraints = await loadConstraints();
    expect(constraints).toHaveLength(1);
    expect(constraints[0].domain).toBe('not a domain');
  });

  it('makes two differently-formatted stored domains that are effectively the same comparable after load', async () => {
    installChromeMock({
      constraints: [
        makeStoredConstraint({ id: 'a', domain: 'WWW.Example.com' }),
        makeStoredConstraint({ id: 'b', domain: 'example.com' }),
      ],
    });
    const constraints = await loadConstraints();
    expect(constraints[0].domain).toBe(constraints[1].domain);
  });

  it('still defaults isPrivate for constraints saved before that field existed', async () => {
    const legacy = { ...makeStoredConstraint({}) } as Partial<Constraint>;
    delete legacy.isPrivate;
    installChromeMock({ constraints: [legacy] });
    const constraints = await loadConstraints();
    expect(constraints[0].isPrivate).toBe(false);
  });
});
