import React, { useEffect, useState, useRef } from 'react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onCloseRef.current(), 150);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const classes = [styles.toast, styles[variant], isVisible && styles.visible]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      <span className={styles.message}>{message}</span>
    </div>
  );
};
