// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Dashboard } from './Dashboard';
import type { Constraint } from '../../shared/types/constraint';

// Required for React 18's `act()` (imported from 'react' itself, not
// react-dom/test-utils) to recognize this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Milestone 8 (#18): Dashboard's constraint rows were a bare, inert <div>
// with no click/keyboard path to Edit at all (BOOMRNG-V2-DESIGN-SPEC.md
// §9's "Tap a row → opens Edit"). This file covers only the two things
// that changed — that the row is a real interactive element, and that it
// requests edit for the right constraint — not the rest of Dashboard's
// rendering, which is already exercised indirectly elsewhere.

vi.mock('../hooks/useConstraints', () => ({
  useConstraints: () => [
    [
      {
        id: 'dash-row-1',
        domain: 'example.com',
        behavior: 'checkpoint',
        delayMinutes: null,
        schedule: null,
        customMessage: null,
        createdAt: Date.now(),
        progressiveDelay: null,
        isPrivate: false,
      } satisfies Constraint,
    ],
    vi.fn(),
    false,
  ],
}));

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => [{ pin: null, tabBudget: 10, allowedSites: [], schemaVersion: 1 }, vi.fn(), false],
}));

vi.mock('../hooks/useTabCount', () => ({
  useTabCount: () => 0,
}));

function renderDashboard(onOpenEdit: (id: string) => void) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Dashboard onNavigate={() => {}} onOpenEdit={onOpenEdit} />);
  });
  return { container, root };
}

function cleanup(container: HTMLDivElement, root: Root) {
  act(() => {
    root.unmount();
  });
  container.remove();
}

describe('Dashboard constraint row', () => {
  it('renders as a native <button>, not a div emulating one', () => {
    const { container, root } = renderDashboard(vi.fn());
    try {
      const row = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('example.com')
      );
      expect(row).toBeTruthy();
      expect(row?.tagName).toBe('BUTTON');
      expect(row?.getAttribute('type')).toBe('button');
    } finally {
      cleanup(container, root);
    }
  });

  it('requests edit for the correct constraint id when clicked', () => {
    const onOpenEdit = vi.fn();
    const { container, root } = renderDashboard(onOpenEdit);
    try {
      const row = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('example.com')
      ) as HTMLButtonElement;

      act(() => {
        row.click();
      });

      expect(onOpenEdit).toHaveBeenCalledTimes(1);
      expect(onOpenEdit).toHaveBeenCalledWith('dash-row-1');
    } finally {
      cleanup(container, root);
    }
  });
});
