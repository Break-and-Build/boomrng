/**
 * Earliest possible synchronous script for every enforcement page
 * (Checkpoint, Delay, PIN Required, Hard Block) — loaded via a plain
 * classic `<script src>` tag, not inline, and not `type="module"` (which
 * defers). Placed before any stylesheet/module load so it still runs
 * before anything else on the page.
 *
 * CSP-repair note: this used to be duplicated inline in each page's own
 * `<head>`. Chrome's extension-page CSP (`script-src 'self'`) has never
 * permitted inline script execution — not an MV3-specific tightening,
 * just the platform's fixed baseline — so that inline version silently
 * never ran in any real Chrome load. Continue/PIN-success/Delay-elapsed
 * only ever worked because `enforcement/shared/utils.ts`'s
 * `getOriginalUrl()` has a defensive fallback that reads the URL fragment
 * directly when this bootstrap "somehow didn't run" — which was, in
 * practice, always. Moving this to an extension-hosted external file
 * (this one) makes it same-origin ('self') to every enforcement page, so
 * it satisfies the existing CSP with no relaxation of any kind.
 *
 * BOOMRNG-V2-DESIGN-SPEC.md §30.7: Chrome's DNR redirect briefly carries
 * the original destination in the URL fragment before any page script
 * can run at all; this reads it, stores it, and strips it from the
 * visible URL as fast as page-controlled JS possibly can, closing the
 * window as tightly as achievable without a new permission. See
 * `enforcement/shared/utils.ts`'s `ORIGINAL_URL_STORAGE_KEY`/
 * `getOriginalUrl()` for the read side. `validation-service.ts`'s
 * `validateUrl()` is the canonical http(s)-only check reused here, and
 * this file mirrors `enforcement/shared/utils.ts`'s
 * `computeOriginalUrlBootstrapAction()`/`applyOriginalUrlBootstrapAction()`
 * exactly (kept in sync manually — a module import is not available this
 * early; `src/enforcement/shared/bootstrap-parity.test.ts` executes this
 * actual file against that canonical spec so drift is caught automatically).
 *
 * Semantics (unchanged from the original inline version):
 * - Hash present and a valid http(s) URL → overwrite the stored original.
 * - Hash present but invalid → clear the stored original (never silently
 *   inherit a previous, unrelated destination stored in the same tab).
 * - Hash absent → leave whatever is already stored alone (the
 *   refresh/reconciliation-reuse case).
 * - The fragment is stripped via `history.replaceState` immediately after
 *   processing, regardless of which branch above ran.
 */
(function () {
  var KEY = 'boomrng_original_url';
  var hash = window.location.hash;
  if (hash && hash.length > 1) {
    var raw = hash.slice(1);
    var valid = null;
    try {
      var u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') valid = raw;
    } catch (e) {}
    if (!valid) {
      try {
        var decoded = decodeURIComponent(raw);
        var u2 = new URL(decoded);
        if (u2.protocol === 'http:' || u2.protocol === 'https:') valid = decoded;
      } catch (e) {}
    }
    try {
      if (valid) {
        window.sessionStorage.setItem(KEY, valid);
      } else {
        // Present but invalid: clear rather than leave alone, so a
        // malformed fresh handoff can never inherit an unrelated
        // previous destination stored in the same tab.
        window.sessionStorage.removeItem(KEY);
      }
    } catch (e) {}
  }
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch (e) {}
})();
