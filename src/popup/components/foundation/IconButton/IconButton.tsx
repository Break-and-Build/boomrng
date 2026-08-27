import React from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger' | 'accent';
  /** 'sm' (26px, default) is the existing size everywhere already using this component; 'md' (32px) is for a standalone primary icon action that needs a guaranteed ≥32×32 hit target (BOOMRNG-V2-DESIGN-SPEC.md §10). */
  size?: 'sm' | 'md';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'default',
  size = 'sm',
  className,
  type = 'button',
  ...props
}) => {
  const classes = [styles.iconButton, styles[variant], styles[size], className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} aria-label={label} {...props}>
      {icon}
    </button>
  );
};
