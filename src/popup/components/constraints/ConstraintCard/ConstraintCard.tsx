import React from 'react';
import type { Constraint } from '../../../../shared/types/constraint';
import { BehaviorBadge } from '../BehaviorBadge';
import styles from './ConstraintCard.module.css';

export interface ConstraintCardProps {
  constraint: Constraint;
  onEdit: (constraint: Constraint) => void;
  onDelete: (constraint: Constraint) => void;
}

export const ConstraintCard: React.FC<ConstraintCardProps> = ({ constraint, onEdit, onDelete }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.domain}>{constraint.domain}</span>
        <BehaviorBadge behavior={constraint.behavior} />
      </div>
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => onEdit(constraint)}
          type="button"
          aria-label={`Edit ${constraint.domain}`}
        >
          Edit
        </button>
        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={() => onDelete(constraint)}
          type="button"
          aria-label={`Delete ${constraint.domain}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
};
