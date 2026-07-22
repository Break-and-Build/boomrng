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
