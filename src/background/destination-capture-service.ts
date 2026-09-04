import type { Constraint } from '../shared/types/constraint';
import { loadConstraints } from '../shared/storage/storage-service';
import { isHostUnderConstraintDomain } from '../shared/utils/domain';
import { validateUrl } from '../shared/services/validation-service';
import { extractHttpHost } from './tab-enforcement-service';

/**
 * Background-owned, tab-scoped record of the exact URL a blocked
 * top-frame navigation was originally headed to — the replacement for
 * embedding that destination in the DNR redirect's URL fragment
 * (BOOMRNG-V2-DESIGN-SPEC.md §30.7, confirmed real-Chrome privacy
 * defect: a fragment-bearing redirect target commits to Chrome History
 * before any page script — including the earliest possible bootstrap —
 * ever runs, so stripping it client-side afterward cannot prevent the
 * disclosure). Never appears in any URL or log, and never persists
 * beyond the current browser session.
 *
 * Backed by `chrome.storage.session`, not an in-memory `Map` — a
 * confirmed real-Chrome regression this replaces: MV3 service workers
 * are idle-terminated after ~30 seconds, and Delay's own Continue can be
 * 1–120 minutes away from capture time with zero messages exchanged with
 * the background in between (its countdown re-render is pure client-side
 * DOM/timer work). An in-memory map is wiped by the all-but-guaranteed
 * worker restart during that wait, and — unlike the pre-§30.7 fragment
 * design, where `sessionStorage` was populated once at page load and
 * survived any such restart because it lived on the page, not the
 * worker — nothing was left to fall back to. Same fix, same reasoning,
 * as `delay-authority-service.ts`'s own Delay authority window, which
 * predates this module and already documents this exact MV3 lifecycle
 * constraint.
 */

const CAPTURE_TTL_MS = 3 * 60 * 60 * 1000; // final backstop only — see module doc; sized above Delay's 120-minute max wait, not to "seconds/minutes."

interface CapturedDestination {
  url: string;
  capturedAt: number;
  constraintId: string;
}

function storageKey(tabId: number): string {
  return `boomrng_destination_capture_${tabId}`;
}

/**
 * Per-tab serialized mutation chain — closes a real ordering gap a naive
 * "track the latest promise" scheme leaves open: two `chrome.storage.session`
 * calls for the same tab (e.g. a capture immediately followed by a clear,
 * or two captures from two rapid navigations) are independent async
 * operations with no inherent guarantee they *settle* in the order they
 * were *started* — the later-started one could resolve first, leaving
 * storage holding the older, wrong value. Chaining each new mutation onto
 * the previous one's settlement — not onto when it merely *started* —
 * guarantees each mutation only begins once the previous one for that
 * exact tab has fully applied, so the final state always reflects the
 * most recently *enqueued* mutation, never whichever happened to finish
 * first.
 *
 * `.catch(() => {})` on the previous link, not on the mutation itself: a
 * failed mutation must not poison the chain and block every subsequent
 * one for that tab — `writeCapture`/`removeCapture` already never throw
 * (they catch internally), so this is defense in depth for the chain
 * mechanism itself, independent of whether every future caller of
 * `enqueueMutation` remembers to protect its own mutation function.
 *
 * Different tabs are independent `Map` entries — mutations for one tab
 * never wait on another's chain.
 */
const mutationChains = new Map<number, Promise<void>>();

function enqueueMutation(tabId: number, mutation: () => Promise<void>): Promise<void> {
  const previousTail = mutationChains.get(tabId) ?? Promise.resolve();
  const tail: Promise<void> = previousTail.catch(() => {}).then(mutation);

  mutationChains.set(tabId, tail);

  // Removed only if this link is still the current tail — a later
  // mutation enqueued before this one settles has already replaced it in
  // the map, and that later mutation's own settlement is what should
  // eventually clear the entry, not this one arriving "late."
  tail.then(
    () => {
      if (mutationChains.get(tabId) === tail) mutationChains.delete(tabId);
    },
    () => {
      if (mutationChains.get(tabId) === tail) mutationChains.delete(tabId);
    }
  );

  return tail;
}

async function writeCapture(tabId: number, url: string, constraintId: string): Promise<void> {
  try {
    await chrome.storage.session.set({
      [storageKey(tabId)]: { url, capturedAt: Date.now(), constraintId } satisfies CapturedDestination,
    });
  } catch {
    // Best-effort — a failed write degrades to "nothing captured," same
    // as never having captured at all; never thrown to the caller.
  }
}

async function removeCapture(tabId: number): Promise<void> {
  try {
    await chrome.storage.session.remove(storageKey(tabId));
  } catch {
    // Same acceptance as writeCapture above.
  }
}

/**
 * Synchronously-readable mirror of the live constraint list — the one
 * piece of machinery that makes `handleBeforeNavigate`'s *decision*
 * (capture vs. clear vs. no-op) deterministic. `chrome.webNavigation.onBeforeNavigate`
 * and a subsequent `GET_CAPTURED_DESTINATION` message can arrive close
 * enough together that an async `loadConstraints()` call inside the
 * navigation handler is not guaranteed to have resolved before the
 * message is processed — "storage should finish quickly" is not a
 * correctness argument. Kept current by `refreshConstraintCache`, called
 * from the exact same `loadConstraints()` result `service-worker.ts`'s
 * `storage.onChanged` handler already fetches for
 * `pruneStaleDelayAuthorities`/`pruneStaleDocumentClearances` — no extra
 * storage read.
 */
let constraintCache: Constraint[] = [];

export function refreshConstraintCache(constraints: Constraint[]): void {
  constraintCache = constraints;
}

function findLiveMatch(host: string, constraints: Constraint[]): Constraint | null {
  return constraints.find((c) => isHostUnderConstraintDomain(c.domain, host)) ?? null;
}

export function clearCapturedDestination(tabId: number): void {
  enqueueMutation(tabId, () => removeCapture(tabId));
}

/**
 * The single decision made on every top-frame navigation, browser-wide —
 * the decision itself is synchronous end to end (see `constraintCache`
 * above); the resulting storage mutation is enqueued onto that tab's
 * chain, not awaited here.
 *
 * Three-way outcome, not two: a navigation to Boomrng's own
 * `chrome-extension://` redirect target (or any other non-http(s)
 * target) is neither a capture nor a clear — `extractHttpHost` returns
 * `null` for it, so the existing capture for this tab is left completely
 * untouched. This is what lets a capture survive the DNR redirect itself
 * landing on the enforcement page, a same-tab refresh, and a stale-route
 * `location.replace()` between enforcement pages, without needing to
 * special-case any of them individually — none of those targets are
 * http(s), so none of them ever reach the branches below.
 *
 * A real http(s) navigation that does *not* match any live constraint
 * explicitly clears (not just leaves to overwrite-or-TTL) whatever was
 * captured for this tab — the tab-close/overwrite/TTL layers alone were
 * judged insufficient: without this, a capture from an earlier
 * constrained visit could otherwise be found "still valid" by
 * `getCapturedDestination` for an unrelated later request that happens
 * to reuse the same tab, purely because nothing had overwritten it yet
 * and the TTL hadn't elapsed.
 */
export function handleBeforeNavigate(details: { tabId: number; frameId: number; url: string }): void {
  if (details.frameId !== 0) return;

  const host = extractHttpHost(details.url);
  if (!host) return;

  const constraint = findLiveMatch(host, constraintCache);
  if (constraint) {
    enqueueMutation(details.tabId, () => writeCapture(details.tabId, details.url, constraint.id));
  } else {
    enqueueMutation(details.tabId, () => removeCapture(details.tabId));
  }
}

/**
 * The one read path — re-validates fully live every time, never trusting
 * that a captured record is still legitimate just because it exists.
 *
 * First awaits this tab's current mutation-chain tail, if any — the
 * deterministic handoff: a read arriving while a write or clear is still
 * in flight for this exact tab waits for that exact mutation (and
 * everything already queued ahead of it) to fully settle before ever
 * touching storage, rather than racing it.
 *
 * Then: fresh (TTL), belongs to the exact constraint id the caller
 * itself already resolved (never a bare domain string — a sibling
 * enforcement page cannot ask for "whatever is captured for this tab"
 * independent of which constraint it's actually showing), and —
 * re-checked against *live* storage, not the cache used for
 * capture-time matching, so an edit made after capture is always
 * honored — the captured URL's own host is still
 * `isHostUnderConstraintDomain()` of the live constraint's current
 * domain (catches a same-id domain edit between capture and serve;
 * deliberately the same one-way, DNR-equivalent check used at capture
 * time, not the bidirectional `isDomainMatch()`), and the live behavior
 * is not Hard Block (Hard Block never offers a path to its destination
 * under any circumstance — block.ts already never calls anything that
 * would reach this function, and this is the defense-in-depth backstop
 * for that invariant, not the only thing enforcing it).
 */
export async function getCapturedDestination(tabId: number, expectedConstraintId: string): Promise<string | null> {
  const pendingTail = mutationChains.get(tabId);
  if (pendingTail) {
    try {
      await pendingTail;
    } catch {
      // enqueueMutation's own chain-link already swallows mutation
      // failures internally; this is defense in depth only — either way,
      // proceed to read whatever is actually in storage now.
    }
  }

  let stored: CapturedDestination | undefined;
  try {
    const key = storageKey(tabId);
    const data = await chrome.storage.session.get(key);
    stored = data[key] as CapturedDestination | undefined;
  } catch {
    return null;
  }

  if (!stored) return null;
  if (Date.now() - stored.capturedAt > CAPTURE_TTL_MS) return null;
  if (stored.constraintId !== expectedConstraintId) return null;
  if (!validateUrl(stored.url)) return null;

  const constraints = await loadConstraints();
  const liveConstraint = constraints.find((c) => c.id === expectedConstraintId);
  if (!liveConstraint || liveConstraint.behavior === 'hard-block') return null;

  const host = extractHttpHost(stored.url);
  if (!host || !isHostUnderConstraintDomain(liveConstraint.domain, host)) return null;

  return stored.url;
}
