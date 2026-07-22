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
