/**
 * Background-owned, in-memory, one-shot PIN continuation authorization.
 *
 * Added to close a confirmed self-bypass: `REQUEST_CONTINUE` used to
 * authorize a pin-required constraint's continuation purely by checking
 * that the live constraint's *behavior* was pin-required — it never
 * checked that a PIN had actually been verified for this request. A
 * user with DevTools open on the PIN enforcement page (or any of this
 * extension's own pages) could call `chrome.runtime.sendMessage({type:
 * 'REQUEST_CONTINUE', domain: '<pin-required-domain>'})` directly and
 * receive a grant with no PIN ever entered.
 *
 * This module is the fix's trusted-state half: a correct PIN mints a
 * short-lived, single-use record here; `REQUEST_CONTINUE` for a
 * pin-required constraint must find and consume a matching one or it is
 * denied. It is pure in-memory (a plain module-level `Map`), never
 * `chrome.storage` of any kind — this is deliberate and load-bearing:
 * an extension page's DevTools console has no access to the service
 * worker's own JS heap at all (the only channel between them is
 * `chrome.runtime.sendMessage`, fully mediated by the handlers that call
 * into this module), whereas *any* `chrome.storage` area (including
 * `session`) is directly readable and writable by the extension's own
 * pages by default and would not actually be unforgeable.
 *
 * Lost on service-worker restart, same as `continuation-service.ts`'s
 * own `activeGrants` bookkeeping — accepted deliberately, not an
 * oversight. The realistic gap between a correct PIN and the
 * immediately-following `REQUEST_CONTINUE` is one synchronous
 * request/response pair with no user interaction in between
 * (`pin.ts` awaits `VALIDATE_PIN` then immediately awaits
 * `requestContinuation`), so a mid-flight restart is rare; if it
 * happens, the request is denied and the page's own existing
 * "Something went wrong. Try again." path handles it (candidate
 * preserved, no forced re-typing) — clicking Verify PIN again
 * re-verifies and re-mints. No new UX was added for this case because
 * the existing one already covers it correctly.
 */

const PIN_AUTH_TTL_MS = 10_000;

interface PinAuthorization {
  domain: string;
  constraintId: string;
  expiresAt: number;
}

const pinAuthorizations = new Map<number, PinAuthorization>();

/** Called on every VALIDATE_PIN attempt, right or wrong, before anything else — a fresh attempt always invalidates whatever was pending for this tab. */
export function clearPinAuthorization(tabId: number): void {
  pinAuthorizations.delete(tabId);
}

/** Called only after `verifyPin()` has returned `true` for this exact domain's live pin-required constraint. */
export function mintPinAuthorization(tabId: number, domain: string, constraintId: string): void {
  pinAuthorizations.set(tabId, { domain, constraintId, expiresAt: Date.now() + PIN_AUTH_TTL_MS });
}

/**
 * One-shot: the entry is removed as soon as consumption is attempted,
 * whether or not it actually matches — a second call for the same tab
 * always fails, forcing re-verification rather than becoming a reusable
 * grant factory.
 */
export function consumePinAuthorization(tabId: number, domain: string, constraintId: string): boolean {
  const auth = pinAuthorizations.get(tabId);
  pinAuthorizations.delete(tabId);
  if (!auth) return false;
  if (auth.expiresAt <= Date.now()) return false;
  return auth.domain === domain && auth.constraintId === constraintId;
}
