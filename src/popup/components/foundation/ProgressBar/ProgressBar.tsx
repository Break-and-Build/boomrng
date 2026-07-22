import React from 'react';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const classes = [styles.progress, styles[variant], styles[size]]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrapper}>
      <div
        className={classes}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
      {showLabel && (
        <span className={styles.label}>
          {value} / {max}
        </span>
      )}
    </div>
  );
};
