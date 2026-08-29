import React from 'react';
import { ConfirmationDialog } from '../../feedback/ConfirmationDialog';

export interface ForgotPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * The single confirmation shown everywhere "Forgot PIN?" can be triggered
 * (Settings' Change/Clear PIN, Sites' private-constraint unlock and delete
 * authorization) — one shared copy so the destructive scope is described
 * identically no matter where recovery was started from
 * (BOOMRNG-V2-DESIGN-SPEC.md §14). This dialog only asks; the actual reset
 * (clearing the PIN and deleting protected constraints) lives in
 * `pin-recovery-service.ts` and is invoked by the caller's `onConfirm`.
 */
export const ForgotPinDialog: React.FC<ForgotPinDialogProps> = ({ isOpen, onClose, onConfirm }) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Forgot your PIN?"
    message="Resetting your PIN will remove PIN protection and delete all private and PIN-required constraints. Your other constraints will remain."
    confirmLabel="Reset PIN"
    cancelLabel="Cancel"
    variant="danger"
  />
);
