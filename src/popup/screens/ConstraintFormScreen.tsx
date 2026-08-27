import React, { useEffect, useRef } from 'react';
import type { Constraint } from '../../shared/types/constraint';
import { useConstraints } from '../hooks/useConstraints';
import { useToast } from '../context/ToastContext';
import { ConstraintForm, type ConstraintFormSubmitData } from '../components/constraints/ConstraintForm';
import styles from './ConstraintFormScreen.module.css';

export interface ConstraintFormScreenProps {
  mode: 'add' | 'edit';
  constraint: Constraint | null;
  onBack: () => void;
  onNavigateToSettings: () => void;
}

export const ConstraintFormScreen: React.FC<ConstraintFormScreenProps> = ({
  mode,
  constraint,
  onBack,
  onNavigateToSettings,
}) => {
  const [constraints, setConstraints] = useConstraints();
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add mode autofocuses Domain (see ConstraintForm); edit mode has no
    // field that deserves that, so move a11y focus to the screen itself
    // rather than leaving it stranded on the now-unmounted Edit button.
    if (mode === 'edit') {
      containerRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const existingDomains = constraints
    .map((c) => c.domain)
    .filter((d) => !(mode === 'edit' && constraint && d === constraint.domain));

  const handleSubmit = (data: ConstraintFormSubmitData) => {
    if (mode === 'add') {
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
        isPrivate: data.isPrivate,
      };
      setConstraints([...constraints, newConstraint]);
      showToast(data.isPrivate ? 'Added private constraint' : `Added constraint for ${data.domain}`, 'success');
    } else if (constraint) {
      const updated = constraints.map((c) =>
        c.id === constraint.id
          ? {
              ...c,
              domain: data.domain,
              behavior: data.behavior,
              delayMinutes: data.delayMinutes,
              customMessage: data.customMessage,
              isPrivate: data.isPrivate,
            }
          : c
      );
      setConstraints(updated);
      showToast(data.isPrivate ? 'Updated private constraint' : `Updated constraint for ${data.domain}`, 'success');
    }
    onBack();
  };

  if (mode === 'edit' && !constraint) return null;

  return (
    <div className={styles.screen} ref={containerRef} tabIndex={-1}>
      <ConstraintForm
        mode={mode}
        initialDomain={constraint?.domain}
        initialBehavior={constraint?.behavior}
        initialDelayMinutes={constraint?.delayMinutes ?? undefined}
        initialIsPrivate={constraint?.isPrivate}
        initialReason={constraint?.customMessage}
        existingDomains={existingDomains}
        onSubmit={handleSubmit}
        onNavigateToSettings={onNavigateToSettings}
      />
    </div>
  );
};
