import { normalizeDomain } from '../shared/utils/domain';
import { buildBlockedSiteRegexFilter } from './rules-builder';
import { loadConstraints } from '../shared/storage/storage-service';
import { findMatchingConstraint } from '../shared/services/enforcement-context-service';
import type { Constraint, ConstraintBehavior } from '../shared/types/constraint';
import { consumePinAuthorization } from './pin-authorization-service';
import { isDelayWindowElapsed } from './delay-authority-service';

/**
 * Grants a single, deliberately narrow, temporary exception to an active
 * constraint's DNR block — "intentional continuation" past Checkpoint,
 * Delay, or a successful PIN check (BOOMRNG-V2-DESIGN-SPEC.md §30,
 * follow-up architecture review). This module is the *only* place that
 * touches `chrome.declarativeNetRequest.updateSessionRules` for this
 * purpose — checkpoint.ts/delay.ts/pin.ts never construct a rule
 * themselves, they only ask the background (via a message) to grant one.
 *
 * The invariant this module exists to guarantee: a grant authorizes
 * exactly the one navigation that follows it, for exactly the one tab
 * that asked, and stops mattering the moment that navigation resolves —
 * never a standing exemption for the domain, never visible to any other
 * tab, and never written to `chrome.storage` (so it cannot outlive the
 * browser session even in the worst case, and never becomes a de facto
 * permanent exemption field on `Constraint`).
 *
 * **Security boundary, added after a confirmed real-Chrome bypass.**
 * Every enforcement page is a `web_accessible_resource` matched against
 * `<all_urls>` (manifest.json) — a user can navigate directly to
 * Checkpoint's own page with an arbitrary `?domain=`, and Checkpoint's
 * Continue button is unconditional (no PIN, no timer). Before this
 * change, `grantContinuation` trusted whatever domain string the calling
 * page supplied and granted a same-tab session `allow` rule for it
 * outright — which meant Checkpoint's own always-available Continue
 * button could be used to obtain a grant for a domain configured as
 * Hard Block (or any other domain, constrained or not), fully bypassing
 * it. UI gating (a hidden Continue button, a PIN form, a countdown) is
 * not an authorization boundary — any of it is reachable by simply
 * loading the page directly. The background is now the sole source of
 * truth: `grantContinuation` independently loads the live constraint
 * list and refuses to grant unless a *current* constraint exists for
 * the *exact* requested domain (§30.2's canonical `normalizeDomain()`
 * identity — the same match `findMatchingConstraint()` already uses for
 * every enforcement page's own live-context resolution, not a second,
 * differently-scoped domain parser) whose behavior is one of the three
 * that legitimately end in a continuation request. Hard Block is
 * deliberately absent from that set — there is no code path, no matter
 * which page originates the request, that can produce a grant for it.
 */
const CONTINUATION_ELIGIBLE_BEHAVIORS: ReadonlySet<ConstraintBehavior> = new Set<ConstraintBehavior>([
  'checkpoint',
  'delay',
  'pin-required',
]);

/**
 * Reserved rule-ID range for continuation grants, kept far above the
 * small incrementing IDs `rules-builder.ts`'s `generateRules()` assigns
 * to constraints/allowed-sites (which starts at 1 and grows by roughly
 * one per constraint — realistically never anywhere near this range).
 * Whether dynamic-rule IDs and session-rule IDs actually share one
 * numbering space or are independent per ruleset is NOT documented by
 * Chrome either way; reserving a disjoint range sidesteps that ambiguity
 * entirely rather than assuming an answer. One rule ID per tab
 * (`CONTINUATION_RULE_ID_BASE + tabId`) also makes a re-grant for the
 * same tab collide with — and simply replace — its own prior rule,
 * which is exactly what makes a rapid double-click idempotent rather
 * than accumulating rules.
 */
export const CONTINUATION_RULE_ID_BASE = 900_000;

/**
 * Higher than the persistent block rule's priority 1 and the permanent
 * `allowedSites` mechanism's priority 2 — its own tier, so a continuation
 * grant is unambiguous on inspection as "temporary, click-granted",
 * never confusable with a user-configured permanent allowance. Chrome
 * orders all matching rules (session and dynamic together) by this
 * numeric priority first; a higher-priority `allow` rule wins
 * unconditionally over a lower-priority `redirect` rule — the
 * same-priority `allow` > `block` > `redirect` tiebreak documented by
 * Chrome is not something this design needs to rely on.
 */
export const CONTINUATION_PRIORITY = 3;

/** Best-effort in-worker backstop — not a correctness guarantee, since an MV3 service worker can be terminated before this fires. See the long alarm backstop below for the guarantee. */
const SHORT_BACKSTOP_MS = 10_000;

/** `chrome.alarms` cannot fire sooner than ~30s even for one-shot alarms (Chrome 120+); 1 minute is the smallest well-supported period and is a hard ceiling on how long a grant can ever outlive its intended use, even if every other cleanup layer fails. */
const ALARM_BACKSTOP_MINUTES = 1;

const ALARM_NAME_PREFIX = 'boomrng-continuation-';

function continuationRuleId(tabId: number): number {
  return CONTINUATION_RULE_ID_BASE + tabId;
}

function continuationAlarmName(tabId: number): string {
  return `${ALARM_NAME_PREFIX}${tabId}`;
}

export function isContinuationAlarm(alarmName: string): boolean {
  return alarmName.startsWith(ALARM_NAME_PREFIX);
}

export function tabIdFromContinuationAlarm(alarmName: string): number | null {
  if (!isContinuationAlarm(alarmName)) return null;
  const id = Number(alarmName.slice(ALARM_NAME_PREFIX.length));
  return Number.isInteger(id) ? id : null;
}

/**
 * In-memory only, by design (point 6 of the approved architecture: no
 * continuation state in `chrome.storage`). Lost on service-worker
 * restart — which is fine and expected: `handleTabRemoved()` always
 * attempts removal regardless of this map's contents (a session rule
 * survives a service-worker restart even though this bookkeeping
 * doesn't), and the alarm backstop is Chrome-persisted and needs no
 * memory of this map to fire correctly.
 *
 * Also carries the constraint id/behavior a grant was issued for —
 * needed so `handleNavigationComplete` can tell *which* constraint a
 * completing navigation just legitimately continued past, to hand off
 * to `documentClearance` below. This is additive metadata only; it does
 * not change when or why a grant is created or revoked.
 */
const activeGrants = new Map<
  number,
  { timeoutHandle: ReturnType<typeof setTimeout>; constraintId: string; behavior: ConstraintBehavior }
>();

/**
 * Document-scoped activation-time enforcement clearance (Milestone 9 gap
 * fix — BOOMRNG-V2-DESIGN-SPEC.md tab-activation investigation). Answers
 * "has this exact tab already legitimately continued past this exact
 * constraint, for the document currently loaded" — the signal
 * `tab-enforcement-service.ts`'s activation check needs to avoid
 * re-blocking a tab on every tab-switch after a real Continue, without
 * granting anything the existing per-navigation continuation model
 * doesn't already grant.
 *
 * Deliberately narrower than `activeGrants`'s own lifetime, and derived
 * entirely from the same two events that already exist for continuation
 * cleanup — no independent policy is invented:
 *
 * - Established only inside `handleNavigationComplete`, and only when
 *   that exact completion actually consumed an `activeGrants` entry
 *   (i.e. this is the one navigation the grant was issued for) —
 *   `handleContinuationAlarm` and the short in-process backstop also
 *   call `revokeContinuation` but never look at its return value, so a
 *   grant that times out unconsumed never establishes clearance.
 * - Invalidated by `invalidateDocumentClearance`, called from
 *   `service-worker.ts` on `chrome.tabs.onUpdated`'s `status:'loading'`
 *   — the one `tabs`-API signal that reliably marks the start of a real
 *   new top-level navigation (unlike `pushState`/`replaceState` or a
 *   bfcache-served back/forward restore, neither of which transitions
 *   through `'loading'`), so a document that's still genuinely on
 *   screen keeps its clearance regardless of how long it's been open or
 *   how many times its tab is switched away from and back.
 * - Pruned by `pruneStaleDocumentClearances`, the same shape as
 *   `pruneStaleDelayAuthorities` (id *and* behavior must both still
 *   match the live constraint) for the same reason: a constraint's id
 *   survives a behavior edit, so id-only would wrongly let a Checkpoint
 *   clearance carry over to the same constraint after it becomes Delay.
 *
 * In-memory only, same acceptance as everything else in this file: lost
 * on worker restart, which only ever means one extra, correct
 * activation-time re-check — never a false clearance (see
 * `handleNavigationComplete`'s null-check below).
 */
const documentClearance = new Map<number, { constraintId: string; behavior: ConstraintBehavior }>();

/** Called from `service-worker.ts` on `chrome.tabs.onUpdated`'s `status:'loading'` — see `documentClearance`'s own doc comment for why this exact signal. */
export function invalidateDocumentClearance(tabId: number): void {
  documentClearance.delete(tabId);
}

/** The query `tab-enforcement-service.ts`'s activation check uses — true only when both the constraint id and its current behavior exactly match what this tab was actually granted continuation for. */
export function wasConstraintClearedForTab(tabId: number, constraintId: string, behavior: ConstraintBehavior): boolean {
  const cleared = documentClearance.get(tabId);
  return cleared !== undefined && cleared.constraintId === constraintId && cleared.behavior === behavior;
}

/**
 * Called from the same `chrome.storage.onChanged` handler that already
 * calls `pruneStaleDelayAuthorities` — same shape, same reasoning: a
 * clearance whose constraint was deleted, or whose behavior no longer
 * matches what it was cleared for, no longer describes anything real and
 * must not silently keep exempting that tab from a constraint that has
 * since changed.
 */
export function pruneStaleDocumentClearances(constraints: Constraint[]): void {
  for (const [tabId, cleared] of documentClearance) {
    const owner = constraints.find((c) => c.id === cleared.constraintId);
    const stillLegitimate = owner?.behavior === cleared.behavior;
    if (!stillLegitimate) documentClearance.delete(tabId);
  }
}

export interface GrantContinuationRequest {
  domain: string;
  tabId: number;
}

export interface GrantContinuationResult {
  success: boolean;
  error?: string;
}

/**
 * Grants continuation for one tab/domain pair. Idempotent: granting again
 * for a tab that already has an active grant (a double-click) replaces
 * the identical rule ID and restarts its cleanup timers rather than
 * accumulating a second rule — there is only ever at most one
 * continuation rule per tab.
 *
 * Fails closed: format validation first (cheap, synchronous), then the
 * live-constraint authorization check below — a request only proceeds to
 * actually install a DNR rule once a *current* constraint for this exact
 * domain is found with a continuation-eligible behavior. Every other
 * outcome (no matching constraint at all, or a matching constraint whose
 * behavior isn't in `CONTINUATION_ELIGIBLE_BEHAVIORS` — most importantly
 * `hard-block`) is denied identically to any other failure the caller
 * already handles (`{ success: false }`) — enforcement pages only ever
 * branch on `.success`, never inspect `.error`, so there is nothing
 * page-visible to distinguish "wrong domain" from "not eligible" from
 * "DNR call failed", by design.
 */
export async function grantContinuation({ domain, tabId }: GrantContinuationRequest): Promise<GrantContinuationResult> {
  const host = normalizeDomain(domain);
  if (!host) {
    return { success: false, error: 'Invalid domain' };
  }
  if (!Number.isInteger(tabId) || tabId < 0) {
    return { success: false, error: 'Invalid tab' };
  }

  const constraints = await loadConstraints();
  const constraint = findMatchingConstraint(host, constraints);
  if (!constraint || !CONTINUATION_ELIGIBLE_BEHAVIORS.has(constraint.behavior)) {
    return { success: false, error: 'Continuation not authorized for this domain' };
  }

  // Behavior-category eligibility alone is not the full prerequisite —
  // Checkpoint has none beyond this (intentionally ungated, §12), but
  // pin-required and delay each have their own gate that must be
  // independently, freshly satisfied for *this* request. Re-checking the
  // live constraint above already handles deletion/behavior-change/
  // recreation; these two checks close the remaining, previously-
  // confirmed self-bypass: a page could call REQUEST_CONTINUE directly
  // for a live pin-required or delay domain without ever entering a PIN
  // or waiting, since only the behavior category was checked.
  if (constraint.behavior === 'pin-required') {
    const authorized = consumePinAuthorization(tabId, host, constraint.id);
    if (!authorized) {
      return { success: false, error: 'Continuation not authorized for this domain' };
    }
  } else if (constraint.behavior === 'delay') {
    const elapsed = await isDelayWindowElapsed(host, constraint);
    if (!elapsed) {
      return { success: false, error: 'Continuation not authorized for this domain' };
    }
  }

  const ruleId = continuationRuleId(tabId);

  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          priority: CONTINUATION_PRIORITY,
          action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
          condition: {
            // Same domain-identity + subdomain-inclusive matching the
            // block rule itself uses (BOOMRNG-V2-DESIGN-SPEC.md §30.2) —
            // this is what makes a same-domain server redirect (e.g.
            // facebook.com -> www.facebook.com -> web.facebook.com)
            // survive without the allowance ever reaching past this one
            // domain to wherever a redirect might otherwise lead.
            regexFilter: buildBlockedSiteRegexFilter(host),
            tabIds: [tabId],
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
          },
        },
      ],
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to grant continuation' };
  }

  armCleanup(tabId, constraint.id, constraint.behavior);
  console.log(`[boomrng] Continuation granted (tab=${tabId}, rule=${ruleId})`);
  return { success: true };
}

function armCleanup(tabId: number, constraintId: string, behavior: ConstraintBehavior): void {
  const existing = activeGrants.get(tabId);
  if (existing) clearTimeout(existing.timeoutHandle);

  const timeoutHandle = setTimeout(() => {
    revokeContinuation(tabId).catch((error) => {
      console.error('[boomrng] Failed to revoke continuation (short backstop):', error);
    });
  }, SHORT_BACKSTOP_MS);

  activeGrants.set(tabId, { timeoutHandle, constraintId, behavior });

  // Replaces any existing alarm of the same name outright (documented
  // chrome.alarms.create behavior) — a double-click's second grant just
  // resets this backstop's clock rather than creating a second alarm.
  chrome.alarms.create(continuationAlarmName(tabId), { delayInMinutes: ALARM_BACKSTOP_MINUTES });
}

/**
 * Unconditionally removes the tab's continuation rule and clears its
 * bookkeeping — safe to call even when nothing is active (a no-op
 * `removeRuleIds` for an ID that doesn't exist is harmless), which is
 * what lets every cleanup path call this without first proving a grant
 * exists. The DNR-rule removal and alarm clearing below run exactly as
 * before, regardless of what (if anything) `activeGrants` contains.
 *
 * Returns the `{constraintId, behavior}` this tab's grant was issued for
 * if `activeGrants` actually had one recorded, or `null` otherwise —
 * `null` covers both "no grant was ever active for this tab" and "one
 * was active but this worker instance's memory of it was lost to a
 * restart." Only `handleNavigationComplete` inspects this return value
 * (to decide whether to establish `documentClearance`); every other
 * caller (`handleTabRemoved`, the short backstop, the alarm backstop)
 * discards it, exactly as they discarded this function's `void` result
 * before — this metadata does not change *when* or *why* a grant is
 * revoked, only what a completion is told about what it just consumed.
 */
export async function revokeContinuation(
  tabId: number
): Promise<{ constraintId: string; behavior: ConstraintBehavior } | null> {
  const existing = activeGrants.get(tabId);
  if (existing) clearTimeout(existing.timeoutHandle);
  activeGrants.delete(tabId);

  await chrome.alarms.clear(continuationAlarmName(tabId));

  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [continuationRuleId(tabId)] });
    // Bounded to worker-instance-local bookkeeping on purpose: `existing`
    // is undefined for the overwhelming majority of calls (any tab with
    // no continuation grant this worker instance remembers), so this
    // stays a rare, useful confirmation line rather than one entry per
    // page load browser-wide. It is a best-effort signal only — after a
    // worker restart `existing` is always undefined even for a tab whose
    // rule really was just removed, so its absence here does not mean
    // cleanup didn't happen, only that this worker instance didn't see it start.
    if (existing) {
      console.log(`[boomrng] Continuation cleanup: session rule removed (tab=${tabId}, rule=${continuationRuleId(tabId)})`);
    }
  } catch (error) {
    console.error('[boomrng] Failed to remove continuation session rule:', error);
  }

  // Reported regardless of whether the DNR call above succeeded — the
  // fact this completion consumed a real, recorded grant is independent
  // of whether removing its session rule happened to fail.
  return existing ? { constraintId: existing.constraintId, behavior: existing.behavior } : null;
}

/**
 * The primary cleanup signal — call this from `chrome.tabs.onUpdated`
 * once `changeInfo.status === 'complete'`. Deliberately waits for the
 * *whole* navigation to finish (not the first `onUpdated` event after
 * the grant, which can fire mid-redirect-chain) so cleanup can never run
 * before the intended navigation — including any of its own same-domain
 * redirects — has actually had the chance to pass.
 *
 * Unconditional, like `handleTabRemoved` — does NOT gate on `activeGrants`
 * first. An MV3 service worker can be terminated at any point between a
 * grant and this event (a pending `setTimeout` does not keep a service
 * worker alive, and this event itself may arrive on a freshly-restarted
 * worker instance with an empty, reinitialized `activeGrants` map): if
 * that happens, the earlier `activeGrants.has(tabId)` guard silently
 * skipped real cleanup even though the session rule — Chrome-native,
 * independent of worker lifecycle — was still active, leaving a
 * continuation rule alive until the (up to one minute later) alarm
 * backstop. `revokeContinuation` is cheap and safe to call with nothing
 * to clean up, so there is no real cost to calling it unconditionally
 * here, same as at tab-close.
 *
 * Also the sole place `documentClearance` is ever established. The DNR
 * cleanup above is unconditional and untouched by this — this only asks
 * what `revokeContinuation` found, after it already did its unconditional
 * work. `null` (no grant was active, including "one was active but a
 * worker restart lost the record of it") means exactly one thing here:
 * this completion must never manufacture a clearance it cannot prove —
 * the tab is simply left to be re-checked, correctly, the next time it's
 * activated.
 */
export async function handleNavigationComplete(tabId: number): Promise<void> {
  const consumedGrant = await revokeContinuation(tabId);
  if (consumedGrant) {
    documentClearance.set(tabId, consumedGrant);
  }
}

/**
 * Called from `chrome.tabs.onRemoved`. Unlike `handleNavigationComplete`,
 * this does not gate on `activeGrants` first: a service-worker restart
 * wipes that in-memory map, but the underlying session rule persists
 * regardless (session rules survive a service-worker restart within the
 * same browser session) — if the bookkeeping forgot about a grant, the
 * rule itself hasn't, so tab-close cleanup always attempts removal
 * unconditionally. Tab-close events are rare enough that the extra,
 * usually-unnecessary DNR call here is not a meaningful cost the way it
 * would be on every single page load. Also drops any `documentClearance`
 * for this tab — a closed tab has no document left to be cleared for.
 */
export async function handleTabRemoved(tabId: number): Promise<void> {
  await revokeContinuation(tabId);
  documentClearance.delete(tabId);
}

/** Called from `chrome.alarms.onAlarm` after confirming the alarm name is one of this module's own (`isContinuationAlarm`) — the long-lived, Chrome-persisted backstop that fires even if the service worker was terminated and lost all in-memory state, guaranteeing a grant can never outlive roughly a minute in the worst case. */
export async function handleContinuationAlarm(tabId: number): Promise<void> {
  await revokeContinuation(tabId);
}
