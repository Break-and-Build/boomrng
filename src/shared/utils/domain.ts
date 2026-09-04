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
