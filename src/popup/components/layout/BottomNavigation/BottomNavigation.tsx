import React from 'react';
import { DashboardIcon, SitesIcon, SettingsIcon, type IconProps } from '../../icons';
import styles from './BottomNavigation.module.css';

export interface BottomNavigationProps {
  active: 'dashboard' | 'sites' | 'settings';
  onChange: (screen: 'dashboard' | 'sites' | 'settings') => void;
}

const ITEMS: { id: 'dashboard' | 'sites' | 'settings'; label: string; Icon: React.FC<IconProps> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { id: 'sites', label: 'Sites', Icon: SitesIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ active, onChange }) => {
  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`${styles.item} ${active === id ? styles.active : ''}`}
          onClick={() => onChange(id)}
          aria-current={active === id ? 'page' : undefined}
          type="button"
        >
          <Icon className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
};
