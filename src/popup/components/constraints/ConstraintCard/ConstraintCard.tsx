import React from 'react';
import type { Constraint } from '../../../../shared/types/constraint';
import { BehaviorBadge } from '../BehaviorBadge';
import { LockIcon } from '../../icons';
import styles from './ConstraintCard.module.css';

export interface ConstraintCardProps {
  constraint: Constraint;
  onEdit: (constraint: Constraint) => void;
  onDelete: (constraint: Constraint) => void;
}

export const ConstraintCard: React.FC<ConstraintCardProps> = ({ constraint, onEdit, onDelete }) => {
  // A private constraint's real domain must never reach visible text,
  // title attributes, or accessibility labels — derive one masked value
  // and use it everywhere the domain would otherwise appear.
  const displayDomain = constraint.isPrivate ? 'Private site' : constraint.domain;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={`${styles.domain} ${constraint.isPrivate ? styles.domainPrivate : ''}`}>
          {constraint.isPrivate && <LockIcon className={styles.lockIcon} />}
          {displayDomain}
        </span>
        <BehaviorBadge behavior={constraint.behavior} />
      </div>
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => onEdit(constraint)}
          type="button"
          aria-label={`Edit ${displayDomain}`}
          data-edit-id={constraint.id}
        >
          Edit
        </button>
        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={() => onDelete(constraint)}
          type="button"
          aria-label={`Delete ${displayDomain}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
};
