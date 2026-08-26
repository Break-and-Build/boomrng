import React from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = 'default',
  className,
  type = 'button',
  ...props
}) => {
  const classes = [styles.iconButton, styles[variant], className].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} aria-label={label} {...props}>
      {icon}
    </button>
  );
};
