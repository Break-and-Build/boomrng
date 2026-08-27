import React from 'react';
import { LockIcon } from '../../icons';
import { PinEntryForm } from '../PinEntryForm';
import styles from './RevealBar.module.css';

export type RevealBarState = 'no-pin' | 'locked' | 'pin-entry' | 'unlocked';

export interface RevealBarProps {
  state: RevealBarState;
  pinInput: string;
  pinError: string | null;
  onPinInputChange: (value: string) => void;
  onSubmitPin: (e: React.FormEvent) => void;
  onRequestUnlock: () => void;
  onLock: () => void;
  onNavigateToSettings: () => void;
}

/**
 * Sites-only control for the private-constraint reveal gate
 * (BOOMRNG-V2-DESIGN-SPEC.md §26). Deliberately never states how many
 * private constraints exist — only that protected constraints exist and
 * can be managed after a PIN check. Rendered only when at least one
 * private constraint exists; state is fully controlled by Sites, which
 * also owns the PIN comparison so this component never needs the real PIN.
 */
export const RevealBar: React.FC<RevealBarProps> = ({
  state,
  pinInput,
  pinError,
  onPinInputChange,
  onSubmitPin,
  onRequestUnlock,
  onLock,
  onNavigateToSettings,
}) => {
  if (state === 'pin-entry') {
    return (
      <PinEntryForm
        pinInput={pinInput}
        pinError={pinError}
        onPinInputChange={onPinInputChange}
        onSubmit={onSubmitPin}
        submitLabel="Unlock"
        ariaLabel="Enter PIN to unlock private constraints"
      />
    );
  }

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <LockIcon className={styles.icon} />
        {state === 'no-pin' && (
          <span className={styles.text}>
            Set a PIN in{' '}
            <button type="button" className={styles.inlineLink} onClick={onNavigateToSettings}>
              Settings
            </button>{' '}
            to unlock private constraints.
          </span>
        )}
        {state === 'locked' && (
          <>
            <span className={styles.text}>Private constraints</span>
            <button type="button" className={styles.ghostAction} onClick={onRequestUnlock}>
              Unlock
            </button>
          </>
        )}
        {state === 'unlocked' && (
          <>
            <span className={`${styles.text} ${styles.unlockedText}`}>Private constraints unlocked</span>
            <button type="button" className={styles.ghostAction} onClick={onLock}>
              Lock again
            </button>
          </>
        )}
      </div>
    </div>
  );
};
