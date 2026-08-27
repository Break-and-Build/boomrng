import React from 'react';
import styles from './ProgressArc.module.css';

export interface ProgressArcProps {
  /** 0–100. Values outside this range are clamped. */
  percent: number;
  /** Accessible name for the whole indicator, e.g. "Tab budget: 7 of 10 tabs used, 3 tabs to spare". */
  label: string;
  /** CSS color value for the filled portion (e.g. 'var(--accent)'). */
  color?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Small radial progress ring — the Return Arc motif applied functionally
 * (BOOMRNG-V2-DESIGN-SPEC.md §7, §16), not a loading spinner. Uses a
 * normalized 0–100 viewBox circumference so no circumference math is
 * needed per instance.
 */
export const ProgressArc: React.FC<ProgressArcProps> = ({
  percent,
  label,
  color = 'var(--accent)',
  size = 44,
  strokeWidth = 4.5,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={styles.wrap}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${clamped} ${100 - clamped}`}
          transform="rotate(-90 18 18)"
          className={styles.fill}
        />
      </svg>
    </div>
  );
};
