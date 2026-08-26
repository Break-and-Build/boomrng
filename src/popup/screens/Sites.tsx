import React, { useState, useCallback } from 'react';
import type { Constraint, ConstraintBehavior } from '../../shared/types/constraint';
import { useConstraints } from '../hooks/useConstraints';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/foundation/Button';
import { Spinner } from '../components/foundation/Spinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { ConfirmationDialog } from '../components/feedback/ConfirmationDialog';
import { ConstraintCard } from '../components/constraints/ConstraintCard';
import { AddConstraintModal } from '../components/constraints/AddConstraintModal';
import { EditConstraintModal } from '../components/constraints/EditConstraintModal';
import styles from './Sites.module.css';

export const Sites: React.FC = () => {
  const [constraints, setConstraints, isLoading] = useConstraints();
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<Constraint | null>(null);
  const [deletingConstraint, setDeletingConstraint] = useState<Constraint | null>(null);

  const existingDomains = constraints.map((c) => c.domain);

  const handleAdd = useCallback((data: {
    domain: string;
    behavior: ConstraintBehavior;
    delayMinutes: number | null;
    customMessage: string | null;
  }) => {
    const newConstraint: Constraint = {
      id: crypto.randomUUID(),
      domain: data.domain,
      behavior: data.behavior,
      delayMinutes: data.delayMinutes,
      schedule: null,
      customMessage: data.customMessage,
      createdAt: Date.now(),
      enforcedToday: 0,
      lastEnforcedAt: null,
      progressiveDelay: null,
      isPrivate: false,
    };
    setConstraints([...constraints, newConstraint]);
    showToast(`Added constraint for ${data.domain}`, 'success');
  }, [constraints, setConstraints, showToast]);

  const handleEdit = useCallback((constraint: Constraint) => {
    setEditingConstraint(constraint);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback((data: {
    domain: string;
    behavior: ConstraintBehavior;
    delayMinutes: number | null;
    customMessage: string | null;
  }) => {
    if (!editingConstraint) return;
    const updated = constraints.map((c) =>
      c.id === editingConstraint.id
        ? { ...c, domain: data.domain, behavior: data.behavior, delayMinutes: data.delayMinutes, customMessage: data.customMessage }
        : c
    );
    setConstraints(updated);
    setEditingConstraint(null);
    showToast(`Updated constraint for ${data.domain}`, 'success');
  }, [constraints, setConstraints, editingConstraint, showToast]);

  const handleDeleteClick = useCallback((constraint: Constraint) => {
    setDeletingConstraint(constraint);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingConstraint) return;
    setConstraints(constraints.filter((c) => c.id !== deletingConstraint.id));
    setDeletingConstraint(null);
    showToast(`Deleted constraint for ${deletingConstraint.domain}`, 'success');
  }, [constraints, setConstraints, deletingConstraint, showToast]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Sites</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>Add Constraint</Button>
      </div>

      {constraints.length === 0 ? (
        <EmptyState
          icon="◉"
          title="No constraints yet"
          description="Add your first constraint to start controlling your browsing habits."
          action={
            <Button onClick={() => setIsAddModalOpen(true)}>Add Constraint</Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {constraints.map((constraint) => (
            <ConstraintCard
              key={constraint.id}
              constraint={constraint}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <AddConstraintModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAdd}
        existingDomains={existingDomains}
      />

      <EditConstraintModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingConstraint(null);
        }}
        onSave={handleSaveEdit}
        constraint={editingConstraint}
        existingDomains={existingDomains}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingConstraint(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Constraint"
        message={`Are you sure you want to delete the constraint for ${deletingConstraint?.domain}?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
