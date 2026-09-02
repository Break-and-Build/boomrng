import type { Settings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { Constraint } from '../types/constraint';
import { normalizeDomain } from '../utils/domain';

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  CONSTRAINTS: 'constraints',
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

type StoredConstraint = Omit<Constraint, 'isPrivate'> & { isPrivate?: boolean };

export async function loadConstraints(): Promise<Constraint[]> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.CONSTRAINTS);
  const constraints: StoredConstraint[] = data[STORAGE_KEYS.CONSTRAINTS] || [];
  // Backwards compatibility: constraints saved before `isPrivate` existed
  // won't have the field. Normalize once here rather than defaulting it
  // everywhere the field is read.
  //
  // Domain is also normalized on load (BOOMRNG-V2-DESIGN-SPEC.md §30.2) so
  // a constraint saved before the canonical `normalizeDomain()` identity
  // was consistently applied everywhere (or written by an older version,
  // or restored from an import) compares correctly against everything
  // else that now uses that same identity — the duplicate-domain guard,
  // DNR rule generation, and the enforcement page's live constraint
  // lookup. This never merges or drops a constraint, only canonicalizes
  // its stored domain string; a domain that fails to normalize is left
  // exactly as stored rather than discarding data.
  return constraints.map((c) => ({
    ...c,
    domain: normalizeDomain(c.domain) ?? c.domain,
    isPrivate: c.isPrivate ?? false,
  }));
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
