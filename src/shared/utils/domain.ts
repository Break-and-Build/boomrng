export function normalizeDomain(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value || /\s/.test(value)) return null;

  const withoutProtocol = value.replace(/^https?:\/\//, '');
  const withoutWww = withoutProtocol.replace(/^www\./, '');

  if (
    !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(
      withoutWww
    )
  ) {
    return null;
  }

  return withoutWww;
}

export function isDomainMatch(constraintDomain: string, urlDomain: string): boolean {
  const normalizedConstraint = normalizeDomain(constraintDomain);
  const normalizedUrl = normalizeDomain(urlDomain);

  if (!normalizedConstraint || !normalizedUrl) return false;

  return (
    normalizedUrl === normalizedConstraint ||
    normalizedUrl.endsWith('.' + normalizedConstraint) ||
    normalizedConstraint.endsWith('.' + normalizedUrl)
  );
}

/**
 * True when `host` is exactly `constraintDomain`, or a subdomain of it —
 * the same one-way, self-or-descendant relationship
 * `buildBlockedSiteRegexFilter()` (rules-builder.ts) encodes as a regex
 * for DNR's own block/redirect condition. `host.endsWith('.' +
 * constraintDomain)` after normalization is exactly what that regex's
 * `(?:[a-z0-9-]+\.)*` prefix expresses in string form.
 *
 * Deliberately NOT `isDomainMatch()` above: that helper is bidirectional
 * (also true when `constraintDomain` is itself a subdomain of `host`) —
 * a fuzzy relationship that may suit some other purpose, but is already
 * documented as unsafe for anything that needs to agree with which
 * requests DNR actually intercepts (see
 * `continuation-service.test.ts`'s "domain matching semantics" suite): a
 * constraint on `docs.example.com` must not be treated as matching a
 * plain visit to the parent `example.com`, since DNR's own regex never
 * would. Any code that needs "is this host within a constraint's DNR
 * scope" should use this function, not `isDomainMatch()`.
 */
export function isHostUnderConstraintDomain(constraintDomain: string, host: string): boolean {
  const normalizedConstraint = normalizeDomain(constraintDomain);
  const normalizedHost = normalizeDomain(host);

  if (!normalizedConstraint || !normalizedHost) return false;

  return normalizedHost === normalizedConstraint || normalizedHost.endsWith('.' + normalizedConstraint);
}

/**
 * A capped measure of domain specificity — more labels (`docs.example.com`
 * vs `example.com`) means more specific, but the count is capped so this
 * single value can be used directly to both rank candidates against each
 * other (`findMostSpecificMatchingConstraint()`,
 * `destination-capture-service.ts`) *and* derive a bounded DNR priority
 * offset (`dnr-priority.ts`'s `redirectPriorityForDomain()`) — the same
 * number, not two independently-capped ones. A cap that only applied on
 * the DNR-priority side would let DNR clamp two pathologically deep
 * domains to equal priority while a selector still (wrongly) ranked one
 * above the other — the two would then disagree about which constraint
 * governs a request that a fresh navigation and an activation-time check
 * both need to answer identically.
 *
 * `DOMAIN_SPECIFICITY_CAP = 20` is safe for every domain Boomrng actually
 * accepts: `normalizeDomain()` has no length or label-count limit of its
 * own, and the constraint-domain input is a single free-text field with
 * none either, so there's no repository-enforced bound to cite directly.
 * The bound instead comes from DNS itself (RFC 1035): a fully-qualified
 * domain name is capped at 253 characters total and 63 per label, which
 * puts a hard ceiling around 127 labels even in the most extreme
 * theoretical case (all single-character labels) — 20 sits far below
 * that ceiling while being far above anything a real constraint domain
 * has ever needed (single digits of labels, in practice). A tie between
 * two *different* live constraints both at the cap is only reachable by
 * deliberately typing a domain nested far beyond any real-world site's
 * structure; when that happens, `findMostSpecificMatchingConstraint()`'s
 * tie-break (first match in array order) applies — an accepted,
 * documented limit, not a silent correctness gap for realistic input.
 */
export const DOMAIN_SPECIFICITY_CAP = 20;

export function domainSpecificityRank(host: string): number {
  const normalized = normalizeDomain(host);
  if (!normalized) return 0;
  return Math.min(normalized.split('.').length, DOMAIN_SPECIFICITY_CAP);
}
