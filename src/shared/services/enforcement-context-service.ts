import type { Constraint } from '../types/constraint';
import type { Settings } from '../types/settings';
import { normalizeDomain } from '../utils/domain';
import { loadConstraints, loadSettings } from '../storage/storage-service';

export interface EnforcementContext {
  /** The one constraint whose effective domain matches, or `null` if none does (e.g. it was deleted or edited after the DNR rule that redirected here was generated). */
  constraint: Constraint | null;
  settings: Settings;
}

/**
 * The live-storage counterpart to the old "everything in the redirect
 * URL" approach (BOOMRNG-V2-DESIGN-SPEC.md §30.1). An enforcement page
 * only needs the `domain` from its own URL to look up everything else —
 * `isPrivate`, `customMessage`, `delayMinutes`, and `behavior` all come
 * from the matching constraint returned here, always current as of the
 * moment the page loaded rather than a snapshot from whenever the DNR
 * rule was last regenerated.
 *
 * Matching uses the same canonical `normalizeDomain()` identity used
 * everywhere else a domain is compared (the creation/edit guard, DNR rule
 * generation) — §30.2's "one effective domain = one constraint" only
 * holds if every comparison in the codebase agrees on what "the same
 * domain" means.
 */
export function findMatchingConstraint(domain: string | null, constraints: Constraint[]): Constraint | null {
  const normalizedTarget = domain ? normalizeDomain(domain) : null;
  if (!normalizedTarget) return null;

  return constraints.find((c) => normalizeDomain(c.domain) === normalizedTarget) ?? null;
}

export async function loadEnforcementContext(domain: string | null): Promise<EnforcementContext> {
  const [constraints, settings] = await Promise.all([loadConstraints(), loadSettings()]);
  return {
    constraint: findMatchingConstraint(domain, constraints),
    settings,
  };
}
