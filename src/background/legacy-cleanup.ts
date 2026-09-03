/**
 * V1 legacy storage hygiene — not a migration. Boomrng V1's `chrome.storage.local`
 * keys share no name, shape, or semantics with V2's (`settings`, `constraints`),
 * and V2 never reads any of them. This module only deletes the six known V1
 * keys so they don't sit around indefinitely; it never inspects their values,
 * never interprets them, and never creates or modifies any V2 state.
 */
export const V1_LEGACY_STORAGE_KEYS = [
  'userPin',
  'blockedSites',
  'allowedSites',
  'fallbackRedirect',
  'maxTabs',
  'enabled',
];

export async function removeV1LegacyStorage(): Promise<void> {
  await chrome.storage.local.remove(V1_LEGACY_STORAGE_KEYS);
}
