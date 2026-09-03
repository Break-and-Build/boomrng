import React from 'react';
import { MarkIcon } from '../../icons';
import { pluralize } from '../../../../shared/utils';
import styles from './Header.module.css';

export interface HeaderProps {
  active: boolean;
  /** Real total, including private constraints — only used to compose the status dot's spoken label (BOOMRNG-V2-DESIGN-SPEC.md §22's own example: "Boomrng active, 3 constraints"), never rendered as visible text. */
  count: number;
}

export const Header: React.FC<HeaderProps> = ({ active, count }) => {
  return (
    <header className={styles.header}>
      <MarkIcon className={styles.mark} />
      <span className={styles.wordmark}>boomrng</span>
      <span
        className={`${styles.statusDot} ${active ? styles.active : styles.inactive}`}
        role="status"
        aria-label={active ? `Boomrng active, ${pluralize(count, 'constraint')}` : 'No constraints yet'}
      />
    </header>
  );
};
