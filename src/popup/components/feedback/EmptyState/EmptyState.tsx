import React from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** A muted glyph shown above the title — e.g. one of the shared icon components (`../../icons`), not a raw emoji. Optional: neither current call site passed one before this. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className={styles.container}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
