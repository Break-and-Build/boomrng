// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Constraint } from '../../shared/types/constraint';
import type { SitesNavigationIntent } from '../App';

// Required for React 18's `act()` (imported from 'react' itself, not
// react-dom/test-utils) to recognize this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Milestone 8 (#18): a Dashboard row tap arrives here as an `edit-request`
// navigation intent, not a direct call into the edit flow — because a
// public Dashboard constraint can still be pin-required, and only Sites'
// own `handleEditClick` knows how to gate that (BOOMRNG-V2-DESIGN-SPEC.md
// §14). This file covers only the one property that matters for that
// hand-off: the intent is consumed before authorization runs, and a gated
// constraint never reaches `onEditConstraint` directly. It does not
// re-test `handleEditClick`'s own gating rules (delete/edit PIN flows,
// private unlock, etc.) — those are Sites' pre-existing behavior.

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

function mockHooks(constraints: Constraint[], pin: string | null) {
  vi.doMock('../hooks/useConstraints', () => ({
    useConstraints: () => [constraints, vi.fn(), false],
  }));
  vi.doMock('../hooks/useSettings', () => ({
    useSettings: () => [{ pin, tabBudget: 10, allowedSites: [], schemaVersion: 1 }, vi.fn(), false],
  }));
}

async function renderSites(props: {
  constraints: Constraint[];
  pin: string | null;
  focusHint: SitesNavigationIntent | null;
  onFocusHintConsumed: () => void;
  onEditConstraint: (c: Constraint) => void;
}) {
  vi.resetModules();
  mockHooks(props.constraints, props.pin);
  // Sites calls `useToast()` unconditionally on every render, which throws
  // outside a ToastProvider — and `vi.resetModules()` gives the freshly
  // re-imported Sites its own, separate ToastContext module instance, so
  // the ToastProvider wrapping it must come from that same fresh import,
  // not from a context object statically imported at the top of this file.
  const { Sites: FreshSites } = await import('./Sites');
  const { ToastProvider: FreshToastProvider } = await import('../context/ToastContext');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <FreshToastProvider>
        <FreshSites
          onAddConstraint={() => {}}
          onEditConstraint={props.onEditConstraint}
          onNavigateToSettings={() => {}}
          focusHint={props.focusHint}
          onFocusHintConsumed={props.onFocusHintConsumed}
          privateUnlocked={false}
          onUnlockPrivate={() => {}}
          onLockPrivate={() => {}}
        />
      </FreshToastProvider>
    );
  });
  return { container, root, Sites: FreshSites, ToastProvider: FreshToastProvider };
}

function cleanup(container: HTMLDivElement, root: Root) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

describe('Sites — edit-request navigation intent from Dashboard', () => {
  it('consumes the intent and opens Edit directly for a constraint that needs no gate', async () => {
    const calls: string[] = [];
    const onFocusHintConsumed = vi.fn(() => calls.push('consumed'));
    const onEditConstraint = vi.fn(() => calls.push('edited'));
    const constraint = makeConstraint({ id: 'site-1', domain: 'a.com', behavior: 'checkpoint' });

    const { container, root } = await renderSites({
      constraints: [constraint],
      pin: null,
      focusHint: { type: 'edit-request', id: 'site-1' },
      onFocusHintConsumed,
      onEditConstraint,
    });
    try {
      expect(onFocusHintConsumed).toHaveBeenCalledTimes(1);
      expect(onEditConstraint).toHaveBeenCalledTimes(1);
      expect(onEditConstraint).toHaveBeenCalledWith(constraint);
      // Consumed before the authorized edit runs — not after, and not
      // interleaved — so a later render can never see this hint again.
      expect(calls).toEqual(['consumed', 'edited']);
    } finally {
      cleanup(container, root);
    }
  });

  it('consumes the intent but does not open Edit directly for a pin-required constraint — the PIN gate runs instead', async () => {
    const onFocusHintConsumed = vi.fn();
    const onEditConstraint = vi.fn();
    const constraint = makeConstraint({ id: 'site-2', domain: 'b.com', behavior: 'pin-required' });
    // The same reference throughout — in the real app, App's `sitesFocusHint`
    // state is this exact object until `onFocusHintConsumed` nulls it out;
    // a fresh literal on every render would (correctly) look like a new
    // intent to React's effect deps and re-fire it, which is not what this
    // test is checking.
    const editRequest: SitesNavigationIntent = { type: 'edit-request', id: 'site-2' };

    const { container, root, Sites, ToastProvider } = await renderSites({
      constraints: [constraint],
      pin: '1234',
      focusHint: editRequest,
      onFocusHintConsumed,
      onEditConstraint,
    });
    try {
      expect(onFocusHintConsumed).toHaveBeenCalledTimes(1);
      // The gate intercepted — Edit must not open until a PIN is verified.
      expect(onEditConstraint).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Enter your PIN to edit this constraint.');

      // A pin-required constraint's own re-render (e.g. while the PIN
      // prompt is open) must not replay the same request a second time.
      act(() => {
        root.render(
          <ToastProvider>
            <Sites
              onAddConstraint={() => {}}
              onEditConstraint={onEditConstraint}
              onNavigateToSettings={() => {}}
              focusHint={editRequest}
              onFocusHintConsumed={onFocusHintConsumed}
              privateUnlocked={false}
              onUnlockPrivate={() => {}}
              onLockPrivate={() => {}}
            />
          </ToastProvider>
        );
      });
      expect(onFocusHintConsumed).toHaveBeenCalledTimes(1);
      expect(onEditConstraint).not.toHaveBeenCalled();
    } finally {
      cleanup(container, root);
    }
  });
});
