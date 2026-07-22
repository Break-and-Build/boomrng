import React from 'react';
import styles from './BottomNavigation.module.css';

export interface BottomNavigationProps {
  active: 'dashboard' | 'sites' | 'settings';
  onChange: (screen: 'dashboard' | 'sites' | 'settings') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ active, onChange }) => {
  const items = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '◈' },
    { id: 'sites' as const, label: 'Sites', icon: '◉' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙' },
  ];

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      {items.map((item) => (
        <button
          key={item.id}
          className={`${styles.item} ${active === item.id ? styles.active : ''}`}
          onClick={() => onChange(item.id)}
          aria-current={active === item.id ? 'page' : undefined}
          type="button"
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
