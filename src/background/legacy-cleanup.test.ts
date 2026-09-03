import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installChromeMock, uninstallChromeMock, type ChromeMockHandle } from '../shared/testing/chrome-mock';
import type { Constraint } from '../shared/types/constraint';
import { V1_LEGACY_STORAGE_KEYS, removeV1LegacyStorage } from './legacy-cleanup';

let mock: ChromeMockHandle;

beforeEach(() => {
  mock = installChromeMock();
});

afterEach(() => {
  uninstallChromeMock();
});

describe('removeV1LegacyStorage', () => {
  it('removes every known V1 key', async () => {
    for (const key of V1_LEGACY_STORAGE_KEYS) mock.store[key] = 'legacy-value';

    await removeV1LegacyStorage();

    for (const key of V1_LEGACY_STORAGE_KEYS) expect(key in mock.store).toBe(false);
  });

  it('leaves existing V2 settings and constraints unchanged', async () => {
    for (const key of V1_LEGACY_STORAGE_KEYS) mock.store[key] = 'legacy-value';

    const settings = { pin: '1234', tabBudget: 5, allowedSites: ['localhost'], schemaVersion: 1 };
    const constraint: Constraint = {
      id: 'c1',
      domain: 'example.com',
      behavior: 'checkpoint',
      delayMinutes: null,
      schedule: null,
      customMessage: null,
      createdAt: Date.now(),
      progressiveDelay: null,
      isPrivate: false,
    };
    mock.store.settings = settings;
    mock.store.constraints = [constraint];

    await removeV1LegacyStorage();

    expect(mock.store.settings).toEqual(settings);
    expect(mock.store.constraints).toEqual([constraint]);
  });

  it('creates no constraints key when none existed', async () => {
    mock.store.blockedSites = [{ url: 'youtube.com', timerMinutes: 30, lockUntil: Date.now() + 60000, bypassUntil: null }];

    await removeV1LegacyStorage();

    expect('constraints' in mock.store).toBe(false);
  });
});
