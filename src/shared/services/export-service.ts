import type { Settings } from '../types/settings';
import type { Constraint } from '../types/constraint';
import { loadSettings, loadConstraints, saveSettings, saveConstraints } from '../storage/storage-service';
import { validateConstraint } from './validation-service';

export interface ExportData {
  version: string;
  exportedAt: number;
  settings: Settings;
  constraints: Constraint[];
}

export async function exportData(): Promise<ExportData> {
  const settings = await loadSettings();
  const constraints = await loadConstraints();
  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    settings,
    constraints,
  };
}

export async function importData(data: ExportData): Promise<{ success: boolean; errors: string[] }> {
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

  // Validate against the PIN the import itself would leave in place, not
  // whatever's currently stored — an export/import round trip that
  // carries both a PIN and pin-required constraints together is valid.
  const pinConfigured = Boolean(data.settings?.pin);

  for (const constraint of data.constraints) {
    const validation = validateConstraint(
      constraint.domain,
      constraint.behavior,
      constraint.delayMinutes ?? undefined,
      constraint.customMessage ?? undefined,
      pinConfigured
    );
    if (!validation.isValid) {
      errors.push(`Invalid constraint for ${constraint.domain}: ${validation.errors.map((e) => e.message).join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const settingsSaved = await saveSettings(data.settings);
  const constraintsSaved = await saveConstraints(data.constraints);

  if (!settingsSaved || !constraintsSaved) {
    errors.push('Failed to save imported data');
    return { success: false, errors };
  }

  return { success: true, errors: [] };
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
