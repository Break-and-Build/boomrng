import React, { useState } from 'react';
import { IconButton } from '../../foundation/IconButton';
import { EyeIcon, EyeOffIcon } from '../../icons';
import styles from './PinEntryForm.module.css';

export interface PinEntryFormProps {
  pinInput: string;
  pinError: string | null;
  onPinInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  ariaLabel: string;
  helperText?: string;
  onCancel?: () => void;
  /** True when a correct PIN here *is* the final action (e.g. Clear PIN) rather than a step before a separate confirmation — colors the submit button as destructive instead of the default accent. */
  destructive?: boolean;
  /** Shows a subtle "Forgot PIN?" trigger below the form when the caller supports forgot-PIN recovery here. Recovery itself (the confirmation and the actual reset) is owned entirely by the caller — this component only surfaces the entry point (BOOMRNG-V2-DESIGN-SPEC.md §14). */
  onForgotPin?: () => void;
}

/**
 * The inline PIN-entry form shared by every private-constraint
 * authorization moment (BOOMRNG-V2-DESIGN-SPEC.md §26) — session unlock
 * (via `RevealBar`) and one-off fresh authorization (e.g. deleting a
 * private constraint) look and feel identical, but they are never the
 * same state machine: this component only renders the form and reports
 * submit/cancel — what a correct PIN actually authorizes is entirely up
 * to whichever caller owns that state.
 */
export const PinEntryForm: React.FC<PinEntryFormProps> = ({
  pinInput,
  pinError,
  onPinInputChange,
  onSubmit,
  submitLabel,
  ariaLabel,
  helperText,
  onCancel,
  destructive = false,
  onForgotPin,
}) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={styles.bar}>
      {helperText && <p className={styles.helperText}>{helperText}</p>}
      <form className={styles.pinRow} onSubmit={onSubmit}>
        <div className={styles.pinInputWrapper}>
          <input
            type={revealed ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            className={styles.pinInput}
            placeholder="Enter PIN"
            value={pinInput}
            onChange={(e) => onPinInputChange(e.target.value)}
            aria-label={ariaLabel}
          />
          <IconButton
            icon={revealed ? <EyeOffIcon /> : <EyeIcon />}
            label={revealed ? 'Hide PIN' : 'Show PIN'}
            size="sm"
            className={styles.revealToggle}
            onClick={() => setRevealed((v) => !v)}
          />
        </div>
        <button type="submit" className={destructive ? styles.destructiveAction : styles.ghostAction}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancelAction} onClick={onCancel}>
            Cancel
          </button>
        )}
      </form>
      {pinError && (
        <p className={styles.error} role="alert">
          {pinError}
        </p>
      )}
      {onForgotPin && (
        <button type="button" className={styles.forgotPinLink} onClick={onForgotPin}>
          Forgot PIN?
        </button>
      )}
    </div>
  );
};
