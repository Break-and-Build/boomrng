import { validateUrl } from '../../shared/services/validation-service';
import { getEnforcementPagePath } from '../../shared/services/enforcement-context-service';
import type { Constraint } from '../../shared/types/constraint';
import type { MessageResponse } from '../../shared/types/messages';

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

/**
 * Resolves the fragment into a *safe, navigable* http/https URL, or
 * `null` if nothing usable is present. Two things happen beyond a plain
 * extraction:
 *
 * - A single defensive `decodeURIComponent` pass is attempted if the raw
 *   fragment text isn't itself a valid URL — the fragment is expected to
 *   already be raw, unencoded text (that's what `rules-builder.ts`'s
 *   `regexSubstitution` produces, and empirically what `location.hash`
 *   returns for it), so this exists only to tolerate anything upstream
 *   that percent-encoded the fragment as a whole rather than to reverse
 *   encoding that's expected to be there.
 * - The result is validated as an actual http/https URL before being
 *   trusted for navigation (reusing the same check the popup already
 *   applies to URL input, `validateUrl()`). A malformed fragment, an
 *   empty one, or a non-http(s) scheme (`javascript:`, `data:`, a bare
 *   `chrome-extension:` URL, etc.) must never reach a caller that's about
 *   to navigate to it — this is what makes `goBackToOriginal()` safe to
 *   call unconditionally, and it's a deliberate, explicit rejection
 *   rather than an accident of `new URL()` throwing.
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

  // Fallback only — reachable if a page is opened without a usable
  // fragment (e.g. manually, during development, or a corrupted one).
  // This intentionally still loses path/query, which is exactly why it's
  // a fallback and never the primary path. Do not recreate the original
  // Milestone 0 bug by reaching for this whenever the fragment is
  // present but merely inconvenient — it's a last resort.
  const domain = getUrlParam('domain');
  if (domain) {
    const guessed = `https://${domain}`;
    return validateUrl(guessed) ? guessed : null;
  }

  return null;
}

export function getDomain(): string | null {
  return getUrlParam('domain');
}

export function getBehavior(): string | null {
  return getUrlParam('behavior');
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

  const original = getOriginalUrlFromHash();
  const domain = getDomain();
  const target = new URL(`chrome-extension://${chrome.runtime.id}/dist/${canonicalPath}`);
  if (domain) target.searchParams.set('domain', domain);
  target.searchParams.set('behavior', constraint.behavior);

  window.location.replace(original ? `${target.toString()}#${original}` : target.toString());
  return true;
}
