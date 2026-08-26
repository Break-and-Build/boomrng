import React, { useState, useEffect } from 'react';
import type { ConstraintBehavior } from '../../../../shared/types/constraint';
import { validateConstraint } from '../../../../shared/services/validation-service';
import { normalizeDomain } from '../../../../shared/utils/domain';
import { Input } from '../../foundation/Input';
import { Button } from '../../foundation/Button';
import styles from './ConstraintForm.module.css';

interface ConstraintFormProps {
  initialDomain?: string;
  initialBehavior?: ConstraintBehavior;
  initialDelayMinutes?: number;
  initialCustomMessage?: string;
  existingDomains?: string[];
  onSubmit: (data: {
    domain: string;
    behavior: ConstraintBehavior;
    delayMinutes: number | null;
    customMessage: string | null;
  }) => void;
  onCancel: () => void;
}

const BEHAVIORS: { value: ConstraintBehavior; label: string }[] = [
  { value: 'checkpoint', label: 'Checkpoint' },
  { value: 'delay', label: 'Delay' },
  { value: 'progressive-delay', label: 'Progressive Delay' },
  { value: 'hard-block', label: 'Hard Block' },
  { value: 'pin-required', label: 'PIN Required' },
  { value: 'reflection', label: 'Reflection' },
  { value: 'custom-message', label: 'Custom Message' },
  { value: 'scheduled', label: 'Scheduled' },
];

export const ConstraintForm: React.FC<ConstraintFormProps> = ({
  initialDomain = '',
  initialBehavior = 'checkpoint',
  initialDelayMinutes,
  initialCustomMessage,
  existingDomains = [],
  onSubmit,
  onCancel,
}) => {
  const [domain, setDomain] = useState(initialDomain);
  const [behavior, setBehavior] = useState<ConstraintBehavior>(initialBehavior);
  const [delayMinutes, setDelayMinutes] = useState<string>(
    initialDelayMinutes?.toString() ?? ''
  );
  const [customMessage, setCustomMessage] = useState(initialCustomMessage ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDomain(initialDomain);
    setBehavior(initialBehavior);
    setDelayMinutes(initialDelayMinutes?.toString() ?? '');
    setCustomMessage(initialCustomMessage ?? '');
    setErrors({});
  }, [initialDomain, initialBehavior, initialDelayMinutes, initialCustomMessage]);

  const validate = (): boolean => {
    const normalizedDomain = normalizeDomain(domain);
    const domainError: Record<string, string> = {};

    if (!normalizedDomain) {
      domainError.domain = 'Enter a valid domain (e.g., twitter.com)';
    } else if (existingDomains.includes(normalizedDomain)) {
      domainError.domain = 'This domain already has a constraint';
    }

    const validation = validateConstraint(
      domain,
      behavior,
      delayMinutes ? parseInt(delayMinutes, 10) : undefined,
      customMessage || undefined
    );

    const allErrors: Record<string, string> = { ...domainError };
    for (const error of validation.errors) {
      allErrors[error.field] = error.message;
    }

    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      domain: normalizeDomain(domain) || domain,
      behavior,
      delayMinutes: delayMinutes ? parseInt(delayMinutes, 10) : null,
      customMessage: customMessage || null,
    });
  };

  const showDelay = behavior === 'delay' || behavior === 'progressive-delay';
  const showCustomMessage = behavior === 'custom-message';

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Domain"
        placeholder="twitter.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        error={errors.domain}
        autoFocus
      />

      <div className={styles.field}>
        <label className={styles.label}>Behavior</label>
        <select
          className={styles.select}
          value={behavior}
          onChange={(e) => setBehavior(e.target.value as ConstraintBehavior)}
        >
          {BEHAVIORS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
        {errors.behavior && <p className={styles.error}>{errors.behavior}</p>}
      </div>

      {showDelay && (
        <Input
          label="Delay (minutes)"
          type="number"
          min={1}
          max={120}
          placeholder="5"
          value={delayMinutes}
          onChange={(e) => setDelayMinutes(e.target.value)}
          error={errors.delayMinutes}
        />
      )}

      {showCustomMessage && (
        <div className={styles.field}>
          <label className={styles.label}>Custom Message</label>
          <textarea
            className={styles.textarea}
            placeholder="Enter a message to show when this site is visited..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={3}
          />
          {errors.customMessage && <p className={styles.error}>{errors.customMessage}</p>}
        </div>
      )}

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Constraint</Button>
      </div>
    </form>
  );
};
