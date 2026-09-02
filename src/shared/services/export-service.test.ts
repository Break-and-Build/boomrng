import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeMock, uninstallChromeMock } from '../testing/chrome-mock';
import { importData, type ExportData } from './export-service';
import type { Constraint } from '../types/constraint';
import type { Settings } from '../types/settings';

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

const BASE_SETTINGS: Settings = { pin: null, tabBudget: 10, landingPage: '', allowedSites: [], schemaVersion: 1 };

function makeExport(constraints: Constraint[], settings: Settings = BASE_SETTINGS): ExportData {
  return { version: '1.0.0', exportedAt: Date.now(), settings, constraints };
}

describe('importData — duplicate effective-domain handling', () => {
  beforeEach(() => {
    uninstallChromeMock();
  });

  it('rejects an import containing two constraints for the same effective domain', async () => {
    installChromeMock({ constraints: [], settings: BASE_SETTINGS });
    const data = makeExport([
      makeConstraint({ id: 'a', domain: 'example.com' }),
      makeConstraint({ id: 'b', domain: 'www.example.com' }),
    ]);

    const result = await importData(data);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('example.com'))).toBe(true);
  });

  it('does not reject an import for colliding with data already on the device, because import replaces rather than merges', async () => {
    // saveConstraints() on import is a full replace, not a merge — the
    // device's existing constraints are discarded regardless of what the
    // import contains, so they are never a real collision candidate. This
    // also covers the ordinary case of re-importing a device's own recent
    // backup, which must not be rejected.
    installChromeMock({
      constraints: [makeConstraint({ id: 'existing', domain: 'example.com' })],
      settings: BASE_SETTINGS,
    });
    const data = makeExport([makeConstraint({ id: 'imported', domain: 'https://EXAMPLE.com' })]);

    const result = await importData(data);
    expect(result.success).toBe(true);
  });

  it('does not silently drop or merge either colliding constraint — the import fails as a whole', async () => {
    installChromeMock({ constraints: [], settings: BASE_SETTINGS });
    const data = makeExport([
      makeConstraint({ id: 'a', domain: 'example.com', behavior: 'checkpoint' }),
      makeConstraint({ id: 'b', domain: 'example.com', behavior: 'hard-block' }),
    ]);

    const result = await importData(data);
    expect(result.success).toBe(false);
  });

  it('succeeds for an import with no domain collisions', async () => {
    installChromeMock({ constraints: [], settings: BASE_SETTINGS });
    const data = makeExport([
      makeConstraint({ id: 'a', domain: 'example.com' }),
      makeConstraint({ id: 'b', domain: 'other.com' }),
    ]);

    const result = await importData(data);
    expect(result.success).toBe(true);
  });

  it('succeeds when re-importing the exact same backup that is already stored on the device', async () => {
    installChromeMock({
      constraints: [makeConstraint({ id: 'existing', domain: 'example.com' })],
      settings: BASE_SETTINGS,
    });
    const data = makeExport([makeConstraint({ id: 'existing', domain: 'example.com' })]);

    const result = await importData(data);
    expect(result.success).toBe(true);
  });
});
