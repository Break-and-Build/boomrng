import { validateUrl } from '../../shared/services/validation-service';
import { getEnforcementPagePath, loadEnforcementContext, loadEnforcementContextById, type EnforcementContext } from '../../shared/services/enforcement-context-service';
import type { Constraint } from '../../shared/types/constraint';
import type { MessageResponse } from '../../shared/types/messages';

/**
 * The one key every enforcement page's earliest inline bootstrap script
 * (see each page's own `index.html` `<head>`, first element, plain
 * classic script — not this module, which loads as a deferred
 * `type="module"` and would run too late to matter here) writes the
 * original destination into, and this module reads it back from.
 * BOOMRNG-V2-DESIGN-SPEC.md §30.7. Plain `sessionStorage`, not
 * `chrome.storage.session`: it's automatically scoped per tab (no manual
 * tabId bookkeeping needed), needs no permission beyond what a page
 * already has, and survives a same-origin internal navigation within the
 * same tab (exactly what a stale-route reconciliation reroute is) while
 * being cleared automatically when the tab closes.
 */
export const ORIGINAL_URL_STORAGE_KEY = 'boomrng_original_url';

export function getUrlParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Pure extraction only — whatever text follows the first `#` in this
 * page's own URL, or `null` if there is none. `rules-builder.ts` places
 * the original destination here verbatim, already a complete, navigable
 * URL (BOOMRNG-V2-DESIGN-SPEC.md §30.1) — a fragment is the one position
 * a raw URL can sit without its own `&`/`=`/`#`/`?` characters being
 * mistaken for additional parameters of this page's own URL, and
 * `location.hash` returns everything from the first `#` onward verbatim,
 * including any of those characters the original URL itself contains.
 * This function does not decode or validate the result — see
 * `getOriginalUrl()` for that; something that only wants the raw text
 * (or wants to detect "nothing here" specifically) should call this
 * directly instead.
 */
export function getOriginalUrlFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return null;
  return hash.slice(1);
}

export type OriginalUrlBootstrapAction = { type: 'store'; value: string } | { type: 'clear' } | { type: 'noop' };

/**
 * The exact decision each enforcement page's earliest inline bootstrap
 * script (see e.g. `checkpoint/index.html`'s `<head>`, first element)
 * re-implements as raw, duplicated classic JS — that script runs before
 * any module code, including this one, so it cannot import this
 * function directly. This is the tested, canonical specification the
 * four inline copies are written to match; if this function's behavior
 * ever changes, the four copies need updating by hand to match, and
 * vice versa.
 *
 * BOOMRNG-V2-DESIGN-SPEC.md §30.7 lifecycle rule: hash present + valid
 * http(s) URL → overwrite; hash present + invalid → **clear** (never
 * silently inherit a previous, unrelated stored destination in the same
 * tab); hash absent → **noop**, leaving whatever is already stored alone
 * (the refresh/reconciliation-reuse case).
 */
export function computeOriginalUrlBootstrapAction(hash: string | null): OriginalUrlBootstrapAction {
  if (!hash || hash.length <= 1) return { type: 'noop' };
  const raw = hash.slice(1);
  if (validateUrl(raw)) return { type: 'store', value: raw };
  try {
    const decoded = decodeURIComponent(raw);
    if (validateUrl(decoded)) return { type: 'store', value: decoded };
  } catch {
    // Malformed percent-encoding — falls through to 'clear' below.
  }
  return { type: 'clear' };
}

/** Applies the decision above to `sessionStorage` — see `computeOriginalUrlBootstrapAction()`'s own doc comment; the same duplication caveat applies. */
export function applyOriginalUrlBootstrapAction(action: OriginalUrlBootstrapAction): void {
  try {
    if (action.type === 'store') {
      window.sessionStorage.setItem(ORIGINAL_URL_STORAGE_KEY, action.value);
    } else if (action.type === 'clear') {
      window.sessionStorage.removeItem(ORIGINAL_URL_STORAGE_KEY);
    }
  } catch {
    // sessionStorage can throw in rare restricted contexts.
  }
}

/**
 * Resolves to a *safe, navigable* http/https URL, or `null` if nothing
 * usable is present. Three layers, in order, per
 * BOOMRNG-V2-DESIGN-SPEC.md §30.7:
 *
 * 1. **The hash, defensively.** By the time this module (a deferred
 *    `type="module"` script) runs, the page's own earliest inline
 *    bootstrap script has already read, validated, stored, and stripped
 *    the fragment — so this should normally find nothing. It's kept as a
 *    first check only in case that bootstrap step somehow didn't run,
 *    rather than silently falling through to a worse answer.
 * 2. **`sessionStorage`, the primary path** — what the bootstrap script
 *    actually stored. Re-validated here even though it was already
 *    validated at write time: never trust page-writable storage again
 *    at the point of use without re-checking, the same discipline
 *    applied everywhere else in this codebase a stored value feeds a
 *    navigation decision.
 * 3. **The domain-guess fallback** — unchanged from before this
 *    milestone, reachable if a page is opened with neither a usable
 *    fragment nor a stored value (manually, during development, or a
 *    genuinely corrupted state). Still loses path/query, still a last
 *    resort, never the primary path.
 */
export function getOriginalUrl(): string | null {
  const raw = getOriginalUrlFromHash();

  if (raw) {
    if (validateUrl(raw)) return raw;

    try {
      const decoded = decodeURIComponent(raw);
      if (validateUrl(decoded)) return decoded;
    } catch {
      // Malformed percent-encoding in the fragment — nothing usable here.
    }
  }

  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(ORIGINAL_URL_STORAGE_KEY);
  } catch {
    // sessionStorage can throw in rare restricted contexts — fall through.
  }
  if (stored && validateUrl(stored)) return stored;

  // Domain-guess fallback only — see §30.7 and the doc comment above.
  const domain = getDomain();
  if (domain) {
    const guessed = `https://${domain}`;
    return validateUrl(guessed) ? guessed : null;
  }

  return null;
}

/** `?domain=` — retained narrowly for backward compatibility with an already-open, pre-Milestone-7 enforcement page URL across an extension update (BOOMRNG-V2-DESIGN-SPEC.md §30.7); `getConstraintId()` is the primary lookup a fresh page uses. */
export function getDomain(): string | null {
  return getUrlParam('domain');
}

/** `?cid=` — the opaque constraint id an enforcement page's URL now carries instead of its domain (BOOMRNG-V2-DESIGN-SPEC.md §30.7). */
export function getConstraintId(): string | null {
  return getUrlParam('cid');
}

/**
 * The one place every enforcement page resolves "which constraint am I
 * for" — prefers the opaque `cid` (BOOMRNG-V2-DESIGN-SPEC.md §30.7);
 * falls back to the legacy `domain` param only when `cid` is absent, so
 * an enforcement page already open with a pre-Milestone-7 URL at the
 * moment of an extension update still resolves correctly the next time
 * it loads (e.g. on refresh), without needing a distinct migration step.
 * A fresh redirect after this milestone's rules regenerate always
 * carries `cid`, so this fallback is expected to become unreachable in
 * practice shortly after an update, not a permanent second code path.
 */
export async function resolveEnforcementContext(): Promise<EnforcementContext> {
  const cid = getConstraintId();
  if (cid) {
    return loadEnforcementContextById(cid);
  }
  return loadEnforcementContext(getDomain());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendMessage(message: Record<string, any>): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      resolve(response);
    });
  });
}

/**
 * The single place every enforcement page asks the background to grant
 * intentional continuation past an active constraint — Checkpoint's and
 * Delay's "Continue" and a successful PIN check all call this rather than
 * each constructing the `REQUEST_CONTINUE` message independently. Returns
 * whether the grant succeeded; the caller must not navigate unless this
 * resolves `true` (BOOMRNG-V2-DESIGN-SPEC.md §30 follow-up architecture —
 * no page ever navigates optimistically before a grant is confirmed).
 * The actual rule construction, priority, tab scoping, and cleanup all
 * live entirely in `background/continuation-service.ts`; this function
 * only sends the request and reports the outcome.
 */
export async function requestContinuation(domain: string): Promise<boolean> {
  const response = (await sendMessage({ type: 'REQUEST_CONTINUE', domain })) as MessageResponse | null;
  return response?.success === true;
}

/** "Continue to [destination] anyway" / a successful PIN check — navigates to the validated original destination, or falls back to plain `history.back()` only when no usable destination exists at all. */
export function goBackToOriginal(): void {
  const original = getOriginalUrl();
  if (original) {
    window.location.href = original;
  } else {
    window.history.back();
  }
}

/**
 * "Back to what I was doing" — `history.back()` is always attempted
 * first, since it correctly returns to wherever the user actually came
 * from, which is the "real destination" the design spec asks for rather
 * than a guessed one (BOOMRNG-V2-DESIGN-SPEC.md §15). If this page is the
 * first entry in the tab's history (e.g. the tab's very first navigation
 * was directly to the constrained site), `history.back()` is a silent,
 * synchronously-undetectable no-op — there is no API to ask "will this
 * actually go anywhere" beforehand. When `history.back()` *does* succeed,
 * the browser tears down this document as part of leaving it, which also
 * cancels the timer below before it ever fires — so there is no race
 * between a real navigation succeeding and the fallback firing anyway.
 * Only in the no-history-entry case does this document stay alive long
 * enough for the timer to run and apply the fallback.
 */
export function goBackOrToOriginal(): void {
  const before = window.location.href;
  window.history.back();

  setTimeout(() => {
    if (window.location.href === before) {
      const original = getOriginalUrl();
      if (original) {
        window.location.href = original;
      }
    }
  }, 150);
}

/**
 * Called once, before an enforcement page's own `init()` does anything
 * else — detects whether this page still matches the LIVE constraint's
 * *current* behavior, which is only guaranteed true at the moment DNR
 * first redirected here. A plain refresh, a second tab reusing a
 * since-stale page, or simply leaving the page open while the constraint
 * is edited elsewhere never re-runs DNR (the extension's own
 * `chrome-extension://` URL never matches a block/redirect rule's
 * condition), so nothing else forces a transition on its own
 * (BOOMRNG-V2-DESIGN-SPEC.md §30.9, confirmed real-Chrome bug).
 *
 * Purely a UI/routing concern, not an authorization boundary — the
 * background's own continuation checks (`continuation-service.ts`)
 * already independently re-validate the live constraint on every
 * `REQUEST_CONTINUE`/`GET_DELAY_WINDOW` regardless of what any page
 * displays, so a stale page could only ever show a *misleading* UI
 * (a phantom Delay countdown, a stale Continue button), never actually
 * grant anything a fresh check wouldn't. A misleading UI is still a
 * real bug, so this exists — but it deliberately does not duplicate any
 * authorization decision, only where the page itself should be.
 *
 * Reuses `getEnforcementPagePath()` — the exact same behavior→page
 * mapping `rules-builder.ts` uses to pick a DNR redirect target — so
 * "where should a fresh request for this behavior land" and "where
 * should a stale page for this behavior converge" can never disagree.
 * `window.location.replace()` (not `.href =`) so a chain of corrections
 * never grows the tab's back-history — and cannot loop: the destination
 * page runs this exact same check against the same live constraint on
 * its own load, and by construction its own current path is the
 * canonical one for that constraint, so it always finds itself already
 * correct and stops there.
 *
 * `behavior` is not read back by anything (BOOMRNG-V2-DESIGN-SPEC.md
 * §30.9: query params are never authoritative) — it's included on the
 * rebuilt URL only to keep the same shape `rules-builder.ts` produces.
 *
 * **Never re-embeds the original destination (§30.7).** The rebuilt
 * target carries only `cid`/`behavior` — no fragment at all. This is
 * safe, not lossy: `sessionStorage[ORIGINAL_URL_STORAGE_KEY]` already
 * holds it (written by the page's own earliest inline bootstrap script
 * on first arrival) and survives this same-origin, same-tab
 * `location.replace()` navigation, so the destination page reads it
 * back from there instead. A pleasant side effect of the opaque-id
 * redesign: previously, *every* reconciliation hop re-exposed the
 * domain and full destination in the next fragment, even for an
 * already-private constraint — that no longer happens even once.
 *
 * Returns `true` if this function already navigated the page away (the
 * caller must stop its own `init()` immediately without doing anything
 * else); `false` if the live behavior matches this page and normal
 * initialization should proceed.
 */
export function reconcileStaleEnforcementPage(constraint: Constraint | null): boolean {
  if (!constraint) {
    // No live constraint for this domain at all anymore (deleted through
    // Settings/Sites, a deliberate action — not the narrow mid-redirect
    // race the "missing constraint" display fallback elsewhere in each
    // page's own view-building exists for). Nothing left to enforce:
    // behave exactly like "Continue"/"Back to what I was doing" rather
    // than presenting stale enforcement UI for a constraint that no
    // longer exists.
    goBackToOriginal();
    return true;
  }

  const canonicalPath = getEnforcementPagePath(constraint.behavior);
  const currentPath = window.location.pathname.replace(/^\/+/, '');
  if (currentPath === `dist/${canonicalPath}`) {
    return false;
  }

  const target = new URL(`chrome-extension://${chrome.runtime.id}/dist/${canonicalPath}`);
  target.searchParams.set('cid', constraint.id);
  target.searchParams.set('behavior', constraint.behavior);

  window.location.replace(target.toString());
  return true;
}
