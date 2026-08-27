import React from 'react';
import { IconButton } from '../../foundation/IconButton';
import { BackIcon } from '../../icons';
import styles from './FocusedHeader.module.css';

export interface FocusedHeaderProps {
  title: string;
  onBack: () => void;
}

/**
 * Replaces the persistent app header while a focused sub-flow (Add/Edit
 * Constraint, and later Presets) is active — BOOMRNG-V2-DESIGN-SPEC.md §8, §11.
 * Same 40px header rhythm as the persistent header; back arrow is the
 * only dismissal control (no `×`, no Cancel).
 */
export const FocusedHeader: React.FC<FocusedHeaderProps> = ({ title, onBack }) => {
  return (
    <header className={styles.header}>
      <IconButton icon={<BackIcon />} label="Back to Sites" title="Back to Sites" onClick={onBack} />
      <h2 className={styles.title}>{title}</h2>
    </header>
  );
};
