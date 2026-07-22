import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
  variant?: 'default' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
}) => {
  const classes = [styles.card, styles[variant], styles[padding], className]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button className={classes} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
};
