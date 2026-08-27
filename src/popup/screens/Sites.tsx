import React, { useState, useCallback, useEffect } from 'react';
import type { Constraint } from '../../shared/types/constraint';
import { useConstraints } from '../hooks/useConstraints';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/foundation/Button';
import { IconButton } from '../components/foundation/IconButton';
import { Spinner } from '../components/foundation/Spinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { ConfirmationDialog } from '../components/feedback/ConfirmationDialog';
import { ConstraintCard } from '../components/constraints/ConstraintCard';
import { RevealBar, type RevealBarState } from '../components/constraints/RevealBar';
import { PinEntryForm } from '../components/constraints/PinEntryForm';
import { AddIcon } from '../components/icons';
import type { SitesFocusHint } from '../App';
import styles from './Sites.module.css';

export interface SitesProps {
  onAddConstraint: () => void;
  onEditConstraint: (constraint: Constraint) => void;
  onNavigateToSettings: () => void;
  focusHint: SitesFocusHint | null;
  onFocusHintConsumed: () => void;
  /** Session-scoped private-constraint unlock (BOOMRNG-V2-DESIGN-SPEC.md §26) — lives in App, not here, because Sites unmounts across the Add/Edit focused flow and would otherwise lose it. */
  privateUnlocked: boolean;
  onUnlockPrivate: () => void;
  onLockPrivate: () => void;
}

export const Sites: React.FC<SitesProps> = ({
  onAddConstraint,
  onEditConstraint,
  onNavigateToSettings,
  focusHint,
  onFocusHintConsumed,
  privateUnlocked,
  onUnlockPrivate,
  onLockPrivate,
}) => {
  const [constraints, setConstraints, isLoading] = useConstraints();
  const [settings, , settingsLoading] = useSettings();
  const { showToast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingConstraint, setDeletingConstraint] = useState<Constraint | null>(null);

  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pendingEditConstraint, setPendingEditConstraint] = useState<Constraint | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Delete authorization is deliberately its own, separate state machine
  // from session unlock above — deleting a private constraint requires a
  // fresh PIN every time, regardless of `privateUnlocked`, and a
  // successful check here authorizes only this one deletion. It must
  // never set/clear `privateUnlocked` (BOOMRNG-V2-DESIGN-SPEC.md §26).
  const [deleteVerifyTarget, setDeleteVerifyTarget] = useState<Constraint | null>(null);
  const [deleteVerifyPinInput, setDeleteVerifyPinInput] = useState('');
  const [deleteVerifyPinError, setDeleteVerifyPinError] = useState<string | null>(null);

  const pinConfigured = Boolean(settings.pin);

  // A PIN cleared in Settings while private constraints happen to be
  // unlocked must re-lock them immediately — an unlocked session with
  // nothing left to have unlocked it against is not a state to leave
  // standing (§26: never a guarantee without a PIN to check against).
  // Gated on settingsLoading: Sites remounts on return from a focused
  // sub-flow, and useSettings() briefly reports the DEFAULT_SETTINGS
  // (pin: null) before its real value loads — without this guard, an
  // already-unlocked session gets force-locked on every remount before
  // the real PIN value ever arrives.
  useEffect(() => {
    if (settingsLoading) return;
    if (!pinConfigured && privateUnlocked) {
      onLockPrivate();
    }
  }, [settingsLoading, pinConfigured, privateUnlocked, onLockPrivate]);

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

  const openPinPrompt = useCallback((pendingEdit: Constraint | null) => {
    setPendingEditConstraint(pendingEdit);
    setPinPromptOpen(true);
    setPinInput('');
    setPinError(null);
  }, []);

  const handleRequestUnlock = useCallback(() => {
    openPinPrompt(null);
  }, [openPinPrompt]);

  const handleLock = useCallback(() => {
    onLockPrivate();
  }, [onLockPrivate]);

  const handleSubmitPin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (pinInput === settings.pin) {
        onUnlockPrivate();
        setPinPromptOpen(false);
        setPinInput('');
        setPinError(null);
        if (pendingEditConstraint) {
          const target = pendingEditConstraint;
          setPendingEditConstraint(null);
          onEditConstraint(target);
        }
        return;
      }
      setPinError('Incorrect PIN. Try again.');
      setPinInput('');
    },
    [pinInput, settings.pin, onUnlockPrivate, pendingEditConstraint, onEditConstraint]
  );

  const handleEditClick = useCallback(
    (constraint: Constraint) => {
      if (constraint.isPrivate && !privateUnlocked) {
        if (!pinConfigured) {
          showToast('Set a PIN in Settings to edit private constraints', 'info');
          return;
        }
        openPinPrompt(constraint);
        return;
      }
      onEditConstraint(constraint);
    },
    [privateUnlocked, pinConfigured, showToast, openPinPrompt, onEditConstraint]
  );

  const handleDeleteClick = useCallback(
    (constraint: Constraint) => {
      if (constraint.isPrivate) {
        if (!pinConfigured) {
          showToast('Set a PIN in Settings to delete private constraints', 'info');
          return;
        }
        // Delete is destructive, so it never trusts an existing session
        // unlock — abandon any in-progress unlock/edit PIN attempt too,
        // so returning from a cancelled delete never resurfaces stale
        // pin-entry state left over from a different action.
        setPinPromptOpen(false);
        setPendingEditConstraint(null);
        setDeleteVerifyTarget(constraint);
        setDeleteVerifyPinInput('');
        setDeleteVerifyPinError(null);
        return;
      }
      setDeletingConstraint(constraint);
      setIsDeleteDialogOpen(true);
    },
    [pinConfigured, showToast]
  );

  const handleCancelDeleteVerify = useCallback(() => {
    setDeleteVerifyTarget(null);
    setDeleteVerifyPinInput('');
    setDeleteVerifyPinError(null);
  }, []);

  const handleSubmitDeleteVerifyPin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!deleteVerifyTarget) return;
      if (deleteVerifyPinInput === settings.pin) {
        const target = deleteVerifyTarget;
        setDeleteVerifyTarget(null);
        setDeleteVerifyPinInput('');
        setDeleteVerifyPinError(null);
        setDeletingConstraint(target);
        setIsDeleteDialogOpen(true);
        return;
      }
      setDeleteVerifyPinError('Incorrect PIN. Try again.');
      setDeleteVerifyPinInput('');
    },
    [deleteVerifyTarget, deleteVerifyPinInput, settings.pin]
  );

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
  const hasPrivate = constraints.some((c) => c.isPrivate);
  const deletingLabel = deletingConstraint?.isPrivate ? 'this private constraint' : `the constraint for ${deletingConstraint?.domain}`;

  let revealState: RevealBarState;
  if (!pinConfigured) revealState = 'no-pin';
  else if (privateUnlocked) revealState = 'unlocked';
  else if (pinPromptOpen) revealState = 'pin-entry';
  else revealState = 'locked';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Sites</h2>
        {hasConstraints && (
          <IconButton
            icon={<AddIcon />}
            label="Add constraint"
            title="Add constraint"
            variant="accent"
            size="md"
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
        <>
          {hasPrivate &&
            (deleteVerifyTarget ? (
              <PinEntryForm
                pinInput={deleteVerifyPinInput}
                pinError={deleteVerifyPinError}
                onPinInputChange={setDeleteVerifyPinInput}
                onSubmit={handleSubmitDeleteVerifyPin}
                onCancel={handleCancelDeleteVerify}
                submitLabel="Verify"
                ariaLabel="Enter PIN to delete this private constraint"
                helperText="Enter your PIN to delete this constraint."
              />
            ) : (
              <RevealBar
                state={revealState}
                pinInput={pinInput}
                pinError={pinError}
                onPinInputChange={setPinInput}
                onSubmitPin={handleSubmitPin}
                onRequestUnlock={handleRequestUnlock}
                onLock={handleLock}
                onNavigateToSettings={onNavigateToSettings}
              />
            ))}

          <div className={styles.listGroup}>
            {constraints.map((constraint) => (
              <ConstraintCard
                key={constraint.id}
                constraint={constraint}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                privateUnlocked={privateUnlocked}
              />
            ))}
          </div>
        </>
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
