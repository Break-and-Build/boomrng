import type { Settings } from '../types/settings';
import type { Constraint } from '../types/constraint';
import { loadSettings, loadConstraints, saveSettings, saveConstraints } from '../storage/storage-service';
import { validateConstraint } from './validation-service';
import { isPinProtected } from './pin-recovery-service';
import { normalizeDomain } from '../utils/domain';

export interface ExportData {
  version: string;
  exportedAt: number;
  settings: Settings;
  constraints: Constraint[];
}

export interface ImportResult {
  success: boolean;
  errors: string[];
  /** Number of imported constraints that need a PIN to be usable (PIN-Required or private) and don't have one after the merge — 0 when nothing needs attention. */
  pinDependentCount?: number;
}

/**
 * The PIN is never included, in either mode — see
 * BOOMRNG-V2-DESIGN-SPEC.md §26. Exporting it would mean the one secret
 * every PIN-dependent protection relies on travels inside the exact
 * plaintext file this feature already admits it can't secure.
 */
export async function exportData(includePrivate: boolean = false): Promise<ExportData> {
  const settings = await loadSettings();
  const constraints = await loadConstraints();
  const exportedConstraints = includePrivate ? constraints : constraints.filter((c) => !c.isPrivate);
  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    settings: { ...settings, pin: null },
    constraints: exportedConstraints,
  };
}

function countPinDependent(constraints: Constraint[]): number {
  return constraints.filter(isPinProtected).length;
}

export async function importData(data: ExportData): Promise<ImportResult> {
  const errors: string[] = [];

  if (!data.version) {
    errors.push('Missing version field');
  }

  if (!data.settings || typeof data.settings !== 'object') {
    errors.push('Invalid settings data');
  }

  if (!Array.isArray(data.constraints)) {
    errors.push('Invalid constraints data');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Import is a restore operation, not constraint creation — a PIN-Required
  // constraint being present in the backup is expected and must not fail
  // the import merely because this device has no PIN configured right now.
  // Exports never carry a PIN (see exportData above), so requiring one
  // here would make PIN-dependent constraints permanently non-portable.
  // The caller checks pinDependentCount below and prompts to set a PIN
  // if the restored data actually needs one.
  for (const constraint of data.constraints) {
    const validation = validateConstraint(
      constraint.domain,
      constraint.behavior,
      constraint.delayMinutes ?? undefined,
      constraint.customMessage ?? undefined,
      true
    );
    if (!validation.isValid) {
      errors.push(`Invalid constraint for ${constraint.domain}: ${validation.errors.map((e) => e.message).join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // One effective domain must map to exactly one constraint
  // (BOOMRNG-V2-DESIGN-SPEC.md §30.2), extended to imported data: an
  // import must not silently create two constraints for the same
  // effective domain. This only checks *within* the imported file —
  // `saveConstraints(data.constraints)` below is a full replace, not a
  // merge (a restore genuinely replaces the device's constraint list with
  // the backup's), so whatever domains happen to already be stored before
  // this import runs are about to be discarded regardless and are not a
  // real collision candidate; checking the import file against them would
  // incorrectly reject an entirely ordinary re-import of a device's own
  // recent backup. Rejection reuses the same all-or-nothing convention
  // this function already applies to any other invalid constraint above,
  // rather than silently dropping or merging whichever constraint
  // "loses" — no such precedence is defined, and inventing one here isn't
  // this milestone's decision to make.
  const seenImportedDomains = new Set<string>();
  const reportedDomains = new Set<string>();
  for (const constraint of data.constraints) {
    const normalized = normalizeDomain(constraint.domain);
    if (!normalized || reportedDomains.has(normalized)) continue;

    if (seenImportedDomains.has(normalized)) {
      errors.push(`Duplicate effective domain in import file: ${normalized}`);
      reportedDomains.add(normalized);
    }
    seenImportedDomains.add(normalized);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Never let an import overwrite the local PIN with the imported one —
  // exports always carry `pin: null`, so a naive full overwrite would
  // silently clear any PIN this device already has configured, undoing
  // every protection §14 puts around clearing it deliberately.
  const currentSettings = await loadSettings();
  const settingsToSave: Settings = { ...data.settings, pin: currentSettings.pin };

  const settingsSaved = await saveSettings(settingsToSave);
  const constraintsSaved = await saveConstraints(data.constraints);

  if (!settingsSaved || !constraintsSaved) {
    errors.push('Failed to save imported data');
    return { success: false, errors };
  }

  const pinDependentCount = settingsToSave.pin ? 0 : countPinDependent(data.constraints);

  return { success: true, errors: [], pinDependentCount };
}

export function downloadExport(data: ExportData, filename?: string): void {
  const defaultFilename = `boomrng-export-${new Date().toISOString().split('T')[0]}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
