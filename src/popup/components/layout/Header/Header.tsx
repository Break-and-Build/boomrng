import React from 'react';
import { MarkIcon } from '../../icons';
import styles from './Header.module.css';

export interface HeaderProps {
  active: boolean;
}

export const Header: React.FC<HeaderProps> = ({ active }) => {
  return (
    <header className={styles.header}>
      <MarkIcon className={styles.mark} />
      <span className={styles.wordmark}>boomrng</span>
      <span
        className={`${styles.statusDot} ${active ? styles.active : styles.inactive}`}
        role="status"
        aria-label={active ? 'Boomrng active' : 'No constraints yet'}
      />
    </header>
  );
};
