import React from 'react';
import { Modal } from '../../foundation/Modal';
import { Button } from '../../foundation/Button';
import styles from './ConfirmationDialog.module.css';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
