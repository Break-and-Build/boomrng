import React, { useState } from 'react';
import styles from './Input.module.css';
import { IconButton } from '../IconButton';
import { EyeIcon, EyeOffIcon } from '../../icons';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  /** Adds a show/hide toggle button that switches a `type="password"` field between masked and plain text. No effect on any other `type`. */
  revealable?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, revealable = false, type, ...props }, ref) => {
    const [revealed, setRevealed] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const isRevealableField = revealable && type === 'password';
    const classes = [styles.input, error && styles.error, isRevealableField && styles.revealableInput, className]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputWrapper}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            type={isRevealableField ? (revealed ? 'text' : 'password') : type}
            className={classes}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {isRevealableField && (
            <IconButton
              icon={revealed ? <EyeOffIcon /> : <EyeIcon />}
              label={revealed ? 'Hide PIN' : 'Show PIN'}
              size="sm"
              className={styles.revealToggle}
              onClick={() => setRevealed((v) => !v)}
            />
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className={styles.errorText} role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className={styles.hint}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
