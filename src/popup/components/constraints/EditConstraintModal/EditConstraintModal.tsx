import React from 'react';
import { Modal } from '../../foundation/Modal';
import { ConstraintForm } from '../ConstraintForm';
import type { Constraint, ConstraintBehavior } from '../../../../shared/types/constraint';

export interface EditConstraintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    domain: string;
    behavior: ConstraintBehavior;
    delayMinutes: number | null;
    customMessage: string | null;
  }) => void;
  constraint: Constraint | null;
  existingDomains: string[];
}

export const EditConstraintModal: React.FC<EditConstraintModalProps> = ({
  isOpen,
  onClose,
  onSave,
  constraint,
  existingDomains,
}) => {
  if (!constraint) return null;

  const handleSubmit = (data: {
    domain: string;
    behavior: ConstraintBehavior;
    delayMinutes: number | null;
    customMessage: string | null;
  }) => {
    onSave(data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Constraint">
      <ConstraintForm
        initialDomain={constraint.domain}
        initialBehavior={constraint.behavior}
        initialDelayMinutes={constraint.delayMinutes ?? undefined}
        initialCustomMessage={constraint.customMessage ?? undefined}
        existingDomains={existingDomains.filter((d) => d !== constraint.domain)}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};
