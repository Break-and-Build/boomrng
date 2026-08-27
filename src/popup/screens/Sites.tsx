import React, { useState, useCallback, useEffect } from 'react';
import type { Constraint } from '../../shared/types/constraint';
import { useConstraints } from '../hooks/useConstraints';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/foundation/Button';
import { IconButton } from '../components/foundation/IconButton';
import { Spinner } from '../components/foundation/Spinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { ConfirmationDialog } from '../components/feedback/ConfirmationDialog';
import { ConstraintCard } from '../components/constraints/ConstraintCard';
import { AddIcon } from '../components/icons';
import type { SitesFocusHint } from '../App';
import styles from './Sites.module.css';

export interface SitesProps {
  onAddConstraint: () => void;
  onEditConstraint: (constraint: Constraint) => void;
  focusHint: SitesFocusHint | null;
  onFocusHintConsumed: () => void;
}

export const Sites: React.FC<SitesProps> = ({
  onAddConstraint,
  onEditConstraint,
  focusHint,
  onFocusHintConsumed,
}) => {
  const [constraints, setConstraints, isLoading] = useConstraints();
  const { showToast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingConstraint, setDeletingConstraint] = useState<Constraint | null>(null);

  // Sites remounts on return from a focused sub-flow (Add/Edit Constraint),
  // so the calling button/row no longer exists to hold focus — the hint
  // carried back from App tells us where to restore it. The target button
  // only exists once useConstraints() finishes its initial load, so wait
  // for that rather than consuming the hint against an empty-state render.
  useEffect(() => {
    if (!focusHint || isLoading) return;
    const selector =
      focusHint.type === 'add'
        ? '[data-focus-target="add-constraint"]'
        : `[data-edit-id="${focusHint.id}"]`;
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    target.focus();
    onFocusHintConsumed();
  }, [focusHint, onFocusHintConsumed, isLoading, constraints]);

  const handleDeleteClick = useCallback((constraint: Constraint) => {
    setDeletingConstraint(constraint);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingConstraint) return;
    setConstraints(constraints.filter((c) => c.id !== deletingConstraint.id));
    setDeletingConstraint(null);
    showToast(
      deletingConstraint.isPrivate ? 'Deleted private constraint' : `Deleted constraint for ${deletingConstraint.domain}`,
      'success'
    );
  }, [constraints, setConstraints, deletingConstraint, showToast]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  const hasConstraints = constraints.length > 0;
  const deletingLabel = deletingConstraint?.isPrivate ? 'this private constraint' : `the constraint for ${deletingConstraint?.domain}`;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Sites</h2>
        {hasConstraints && (
          <IconButton
            icon={<AddIcon />}
            label="Add constraint"
            title="Add constraint"
            onClick={onAddConstraint}
            data-focus-target="add-constraint"
          />
        )}
      </div>

      {!hasConstraints ? (
        <EmptyState
          title="Nothing constrained yet."
          description="Add a site you want a pause before opening."
          action={
            <Button onClick={onAddConstraint} data-focus-target="add-constraint">
              Add your first constraint
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {constraints.map((constraint) => (
            <ConstraintCard
              key={constraint.id}
              constraint={constraint}
              onEdit={onEditConstraint}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingConstraint(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Constraint"
        message={`Are you sure you want to delete ${deletingLabel}?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
