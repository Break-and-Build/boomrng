import React from 'react';
import { Modal } from '../../foundation/Modal';
import { ConstraintForm } from '../ConstraintForm';
import type { ConstraintBehavior } from '../../../../shared/types/constraint';

export interface AddConstraintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    domain: string;
    behavior: ConstraintBehavior;
    delayMinutes: number | null;
    customMessage: string | null;
  }) => void;
  existingDomains: string[];
}

export const AddConstraintModal: React.FC<AddConstraintModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingDomains,
}) => {
  const handleSubmit = (data: {
    domain: string;
    behavior: ConstraintBehavior;
    delayMinutes: number | null;
    customMessage: string | null;
  }) => {
    onAdd(data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Constraint">
      <ConstraintForm
        existingDomains={existingDomains}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};
