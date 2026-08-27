import React from 'react';
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
}) => {
  return (
    <div className={styles.bar}>
      {helperText && <p className={styles.helperText}>{helperText}</p>}
      <form className={styles.pinRow} onSubmit={onSubmit}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          className={styles.pinInput}
          placeholder="Enter PIN"
          value={pinInput}
          onChange={(e) => onPinInputChange(e.target.value)}
          aria-label={ariaLabel}
        />
        <button type="submit" className={styles.ghostAction}>
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
    </div>
  );
};
