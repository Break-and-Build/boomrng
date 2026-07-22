import type { Settings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { Constraint } from '../types/constraint';
import type { EnforcementRecord, OverrideSession } from '../types/enforcement';

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  CONSTRAINTS: 'constraints',
  ENFORCEMENT_RECORDS: 'enforcementRecords',
  OVERRIDE_SESSIONS: 'overrideSessions',
  SCHEMA_VERSION: 'schemaVersion',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...data[STORAGE_KEYS.SETTINGS],
  };
}

export async function saveSettings(settings: Settings): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    return true;
  } catch (error) {
    console.error('[boomrng] Failed to save settings:', error);
    return false;
  }
}

export async function loadConstraints(): Promise<Constraint[]> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.CONSTRAINTS);
  return data[STORAGE_KEYS.CONSTRAINTS] || [];
}

export async function saveConstraints(constraints: Constraint[]): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.CONSTRAINTS]: constraints });
    return true;
  } catch (error) {
    console.error('[boomrng] Failed to save constraints:', error);
    return false;
  }
}

export async function loadEnforcementRecords(): Promise<Record<string, EnforcementRecord>> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.ENFORCEMENT_RECORDS);
  return data[STORAGE_KEYS.ENFORCEMENT_RECORDS] || {};
}

export async function loadOverrideSessions(): Promise<OverrideSession[]> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.OVERRIDE_SESSIONS);
  return data[STORAGE_KEYS.OVERRIDE_SESSIONS] || [];
}

export async function saveOverrideSessions(sessions: OverrideSession[]): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.OVERRIDE_SESSIONS]: sessions });
    return true;
  } catch (error) {
    console.error('[boomrng] Failed to save override sessions:', error);
    return false;
  }
}

export function subscribeToStorage<T>(
  key: StorageKey,
  callback: (newValue: T) => void
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[key]) {
      callback(changes[key].newValue as T);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
