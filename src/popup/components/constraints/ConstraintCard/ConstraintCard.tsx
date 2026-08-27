import React from 'react';
import type { Constraint } from '../../../../shared/types/constraint';
import { toV2BehaviorLabel, toV2BehaviorBadgeVariant, formatBehaviorConfig } from '../../../../shared/utils';
import { Badge } from '../../foundation/Badge';
import { LockIcon, EditIcon, DeleteIcon } from '../../icons';
import styles from './ConstraintCard.module.css';

export interface ConstraintCardProps {
  constraint: Constraint;
  onEdit: (constraint: Constraint) => void;
  onDelete: (constraint: Constraint) => void;
  /** Whether private constraints are unlocked for this popup session (BOOMRNG-V2-DESIGN-SPEC.md §26). */
  privateUnlocked: boolean;
}

export const ConstraintCard: React.FC<ConstraintCardProps> = ({ constraint, onEdit, onDelete, privateUnlocked }) => {
  // A masked constraint's real domain must never reach visible text,
  // title attributes, or accessibility labels — derive one masked value
  // and use it everywhere the domain would otherwise appear. Once
  // unlocked for the session, a private constraint behaves like a normal
  // one except for the small "Private" tag that keeps it identifiable.
  const isMasked = constraint.isPrivate && !privateUnlocked;
  const displayDomain = isMasked ? 'Private site' : constraint.domain;
  const label = toV2BehaviorLabel(constraint.behavior);
  const config = formatBehaviorConfig(constraint.behavior, constraint.delayMinutes);

  return (
    <div className={styles.row}>
      <div className={styles.main}>
        <span
          className={`${styles.domain} ${isMasked ? styles.domainPrivate : ''}`}
          title={isMasked ? undefined : constraint.domain}
        >
          {constraint.isPrivate && <LockIcon className={styles.lockIcon} />}
          {displayDomain}
        </span>
      </div>
      <div className={styles.badges}>
        {constraint.isPrivate && !isMasked && <Badge>Private</Badge>}
        <Badge variant={toV2BehaviorBadgeVariant(label)}>{config ? `${label} · ${config}` : label}</Badge>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => onEdit(constraint)}
          type="button"
          aria-label={`Edit ${displayDomain}`}
          title={`Edit ${displayDomain}`}
          data-edit-id={constraint.id}
        >
          <EditIcon />
        </button>
        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={() => onDelete(constraint)}
          type="button"
          aria-label={`Delete ${displayDomain}`}
          title={`Delete ${displayDomain}`}
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
};
