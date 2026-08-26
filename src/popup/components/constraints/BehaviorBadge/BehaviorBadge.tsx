import React from 'react';
import type { ConstraintBehavior } from '../../../../shared/types/constraint';
import { formatBehaviorLabel } from '../../../../shared/utils/format';
import styles from './BehaviorBadge.module.css';

interface BehaviorBadgeProps {
  behavior: ConstraintBehavior;
}

const BEHAVIOR_VARIANTS: Record<ConstraintBehavior, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  checkpoint: 'info',
  delay: 'warning',
  'progressive-delay': 'warning',
  scheduled: 'info',
  'pin-required': 'default',
  reflection: 'info',
  'hard-block': 'error',
  'custom-message': 'default',
};

export const BehaviorBadge: React.FC<BehaviorBadgeProps> = ({ behavior }) => {
  const variant = BEHAVIOR_VARIANTS[behavior];
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {formatBehaviorLabel(behavior)}
    </span>
  );
};
