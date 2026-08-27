import type { ConstraintBehavior } from '../types';

export function formatBehaviorLabel(behavior: ConstraintBehavior): string {
  const labels: Record<ConstraintBehavior, string> = {
    checkpoint: 'Checkpoint',
    delay: 'Delay',
    'progressive-delay': 'Progressive Delay',
    scheduled: 'Scheduled',
    'pin-required': 'PIN Required',
    reflection: 'Reflection',
    'hard-block': 'Hard Block',
    'custom-message': 'Custom Message',
  };
  return labels[behavior];
}

export function formatBehaviorDescription(behavior: ConstraintBehavior): string {
  const descriptions: Record<ConstraintBehavior, string> = {
    checkpoint: 'Shows a calm page before allowing access',
    delay: 'Adds a waiting period before allowing access',
    'progressive-delay': 'Delay increases with each attempt',
    scheduled: 'Only blocks during specific hours',
    'pin-required': 'Requires PIN to access',
    reflection: 'Shows a reflection prompt before access',
    'hard-block': 'Completely blocks access',
    'custom-message': 'Shows your custom message',
  };
  return descriptions[behavior];
}

export type V2BehaviorLabel = 'Checkpoint' | 'Delay' | 'PIN Required' | 'Hard Block';

/**
 * Collapses the full 8-value behavior enum onto the four V2 names
 * (BOOMRNG-V2-DESIGN-SPEC.md §11), for surfaces that must not expose the
 * unfinished/legacy concepts (progressive-delay, scheduled, reflection,
 * custom-message) prominently. Mapping matches what each behavior
 * actually enforces as today (rules-builder.ts's getBehaviorPagePath),
 * so it stays accurate without touching the underlying data model.
 */
export function toV2BehaviorLabel(behavior: ConstraintBehavior): V2BehaviorLabel {
  switch (behavior) {
    case 'delay':
    case 'progressive-delay':
      return 'Delay';
    case 'pin-required':
      return 'PIN Required';
    case 'hard-block':
      return 'Hard Block';
    default:
      return 'Checkpoint';
  }
}

export function toV2BehaviorBadgeVariant(label: V2BehaviorLabel): 'info' | 'warning' | 'default' | 'error' {
  switch (label) {
    case 'Delay':
      return 'warning';
    case 'PIN Required':
      return 'default';
    case 'Hard Block':
      return 'error';
    case 'Checkpoint':
    default:
      return 'info';
  }
}

/** The one piece of per-behavior config worth a badge suffix today ("Delay · 15 min"). Shared by Dashboard and Sites so the two surfaces can't drift (BOOMRNG-V2-DESIGN-SPEC.md §9/§10). */
export function formatBehaviorConfig(behavior: ConstraintBehavior, delayMinutes: number | null): string | null {
  if ((behavior === 'delay' || behavior === 'progressive-delay') && delayMinutes) {
    return `${delayMinutes} min`;
  }
  return null;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function truncateDomain(domain: string, maxLength: number = 20): string {
  if (domain.length <= maxLength) return domain;
  return domain.slice(0, maxLength - 3) + '…';
}

export function getWeekdayName(day: number): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[day] || '';
}
