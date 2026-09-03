import type { Constraint } from '../shared/types/constraint';
import { resolveDelayMinutes, resolveDelayTiming, parseStoredDelayState, type StoredDelayState } from '../enforcement/delay/delay-view';

/**
 * Background-managed, `chrome.storage.session`-backed authoritative Delay
 * window.
 *
 * **Threat-model decision (revised after further review):** an earlier
 * pass moved this into a pure in-memory `Map` to close a real forgery
 * hole (a page could write a fabricated, already-elapsed record via
 * DevTools since `chrome.storage.session`'s default access level makes
 * it page-writable). That fix was itself reverted — MV3 service workers
 * are idle-terminated after ~30 seconds with no activity, which is
 * shorter than the product's own minimum configurable Delay (1 minute),
 * so a module-level `Map` cannot reliably survive an ordinary 1–6 minute
 * wait; a real waiting user would very likely lose their progress before
 * ever clicking Continue.
 *
 * Boomrng is a self-control/friction product, not a tamper-proof
 * parental-control or enterprise-security product. The accepted
 * boundary is: **the background remains the sole authorization
 * decision-maker — no enforcement page can supply `endTime`, an
 * `elapsed` flag, or a constraint ID as proof through the continuation
 * API — but a user who deliberately reverse-engineers Boomrng's internal
 * storage schema and hand-writes a matching, already-elapsed record via
 * DevTools can make the background believe the wait elapsed.** That is
 * considered equivalent in effort/intent to disabling the extension
 * outright via `chrome://extensions`, which already sits outside this
 * product's threat model. This does NOT weaken Hard Block, PIN, or
 * arbitrary-domain continuation authorization — those still require a
 * live, matching constraint/prerequisite the background verifies itself;
 * only Delay's specific "has enough time passed" fact is accepted as
 * tamperable by a sufficiently determined DevTools user. See
 * BOOMRNG-V2-DESIGN-SPEC.md §30.8 for the full rejected-alternatives
 * writeup (SW-memory-only, worker keepalive, sandbox/offscreen).
 *
 * Reuses `delay-view.ts`'s already-locked, already-tested pure timing
 * decision (`resolveDelayTiming`, `parseStoredDelayState`) verbatim —
 * only the storage backing changed, not the product semantics (a window
 * snapshots its duration at creation; a same-ID edit to `delayMinutes`
 * never mutates an already-active window; a different/recreated
 * constraint never inherits a stale window).
 */

const STORAGE_KEY_PREFIX = 'boomrng_delay_authority_';

function storageKey(domain: string): string {
  return `${STORAGE_KEY_PREFIX}${domain}`;
}

async function getStoredState(domain: string): Promise<StoredDelayState | null> {
  const key = storageKey(domain);
  const data = await chrome.storage.session.get(key);
  return parseStoredDelayState(data[key]);
}

async function setStoredState(domain: string, state: StoredDelayState): Promise<void> {
  await chrome.storage.session.set({ [storageKey(domain)]: state });
}

export interface DelayWindow {
  endTime: number;
  totalMs: number;
}

/**
 * Closes a real, confirmed gap: `isStoredStateUsable()`'s ownership check
 * only ever compared `constraintId` — it had no way to tell "the same
 * constraint has been continuously `delay` since this record was
 * created" (the actual Option A scenario it was designed for) apart from
 * "the same constraint ID exists, and this stored record hasn't
 * elapsed yet" (true for a stale record too). A constraint's `id` is
 * stable across an edit — including a behavior change — so editing a
 * Hard Block constraint to Delay, or Delay to Hard Block and back, keeps
 * the same ID throughout. If that domain had an earlier, not-yet-elapsed
 * Delay record (from before the behavior left `delay`), the ownership
 * check alone could not distinguish it from a legitimately still-active
 * window, and it would be wrongly reused — silently keeping the *old*
 * configured duration and ignoring whatever was just saved. Real-Chrome
 * QA confirmed this: Hard Block edited to Delay · 1 min showed 15 min on
 * first visit, because a stale 15-minute record from an earlier Delay
 * period for that same constraint ID was still sitting, unelapsed, in
 * `chrome.storage.session`.
 *
 * The fix: call this whenever the constraint list changes (already the
 * one place a Save actually happens — `service-worker.ts`'s existing
 * `chrome.storage.onChanged` handler for the `'local'` namespace, no new
 * listener needed). It removes any stored Delay record whose domain no
 * longer has a live constraint that is BOTH the exact same `id` AND
 * currently `behavior === 'delay'` — so the moment a constraint leaves
 * `delay` (to Hard Block or anything else), its window is discarded
 * immediately, and if it later becomes `delay` again, there is nothing
 * stale left to inherit; the next `GET_DELAY_WINDOW` starts a genuinely
 * fresh window from whatever duration is live at that moment. A
 * same-ID edit that keeps `behavior === 'delay'` throughout — the actual
 * Option A case — is untouched by this: the record still has a live,
 * matching, still-`delay` owner, so it survives exactly as intended.
 */
export async function pruneStaleDelayAuthorities(constraints: Constraint[]): Promise<void> {
  const all = await chrome.storage.session.get(null);
  const staleKeys: string[] = [];

  for (const key of Object.keys(all)) {
    if (!key.startsWith(STORAGE_KEY_PREFIX)) continue;

    const stored = parseStoredDelayState(all[key]);
    if (!stored) {
      staleKeys.push(key);
      continue;
    }

    const domain = key.slice(STORAGE_KEY_PREFIX.length);
    const owner = constraints.find((c) => c.domain === domain);
    const stillLegitimate = owner?.id === stored.constraintId && owner?.behavior === 'delay';
    if (!stillLegitimate) staleKeys.push(key);
  }

  if (staleKeys.length > 0) {
    await chrome.storage.session.remove(staleKeys);
  }
}

/**
 * Called by `GET_DELAY_WINDOW` for page rendering — the only function
 * that may create or refresh an entry. Returns the active window if one
 * exists for this exact live constraint and hasn't elapsed; otherwise
 * starts a fresh one from the constraint's current `delayMinutes` and
 * persists it, overwriting anything stale (wrong constraint, or already
 * elapsed — a genuinely new visit). The page never supplies or controls
 * this value — it only asks to see it.
 *
 * Returns `null`, and creates or persists nothing, when there is no live
 * constraint at all or its current `behavior` isn't `delay` — confirmed
 * real-Chrome bug: a stale Delay enforcement page (constraint since
 * edited to Hard Block, Checkpoint, or deleted, then this page refreshed
 * without navigating away — see `reconcileStaleEnforcementPage()` in
 * `enforcement/shared/utils.ts`, which is meant to prevent this page
 * from even being on screen in that state, but this is the independent,
 * server-side backstop) must never fabricate a default-15-minute window
 * for a domain that isn't actually configured as Delay right now.
 * Previously this fell through to `resolveDelayMinutes(null)`'s generic
 * fallback and happily created and persisted a bogus window.
 */
export async function resolveDelayWindow(domain: string, constraint: Constraint | null): Promise<DelayWindow | null> {
  if (!constraint || constraint.behavior !== 'delay') return null;

  const liveDelayMinutes = resolveDelayMinutes(constraint);
  const constraintId = constraint.id;
  const now = Date.now();

  const stored = await getStoredState(domain);
  const timing = resolveDelayTiming(stored, constraintId, liveDelayMinutes, now);

  if (!timing.reused) {
    await setStoredState(domain, { endTime: timing.endTime, constraintId, delayMinutes: liveDelayMinutes });
  }

  return { endTime: timing.endTime, totalMs: timing.totalMs };
}

/**
 * The authorization check called by `REQUEST_CONTINUE` — deliberately
 * NOT built on `resolveDelayWindow`. That function's "start a fresh
 * window when the existing one is stale/elapsed" behavior is correct
 * for a genuinely new visit but wrong here: calling it after a real
 * wait has finished would silently replace the just-elapsed window with
 * a brand-new, not-yet-elapsed one, and this check would always answer
 * "no" for the one case that matters. This is a plain, non-mutating
 * read: elapsed only if a record exists, belongs to the exact live
 * constraint, and its own `endTime` has passed. If no record exists at
 * all — including because the page never called `GET_DELAY_WINDOW`
 * first — this denies rather than creating one; a bare
 * `REQUEST_CONTINUE` can never be the first thing that establishes a
 * window. Not one-shot: once genuinely elapsed, repeated checks keep
 * answering true until a fresh window is later created for a new visit.
 *
 * The page cannot supply `endTime`, `elapsed`, or a constraint ID as
 * proof through `REQUEST_CONTINUE` — this function independently reads
 * the persisted record itself and re-validates it against the live
 * constraint passed in by the caller.
 */
export async function isDelayWindowElapsed(domain: string, constraint: Constraint | null): Promise<boolean> {
  const constraintId = constraint?.id ?? null;
  if (!constraintId) return false;

  const stored = await getStoredState(domain);
  if (!stored || stored.constraintId !== constraintId) return false;

  return stored.endTime <= Date.now();
}
