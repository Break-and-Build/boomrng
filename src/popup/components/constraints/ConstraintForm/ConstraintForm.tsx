import React, { useState, useEffect } from 'react';
import type { ConstraintBehavior } from '../../../../shared/types/constraint';
import { validateConstraint } from '../../../../shared/services/validation-service';
import { normalizeDomain } from '../../../../shared/utils/domain';
import { useSettings } from '../../../hooks/useSettings';
import { Input } from '../../foundation/Input';
import { Button } from '../../foundation/Button';
import { CheckpointIcon, DelayIcon, LockIcon, HardBlockIcon, type IconProps } from '../../icons';
import styles from './ConstraintForm.module.css';

export interface ConstraintFormSubmitData {
  domain: string;
  behavior: ConstraintBehavior;
  delayMinutes: number | null;
  customMessage: string | null;
  isPrivate: boolean;
}

interface ConstraintFormProps {
  mode: 'add' | 'edit';
  initialDomain?: string;
  initialBehavior?: ConstraintBehavior;
  initialDelayMinutes?: number;
  initialIsPrivate?: boolean;
  initialReason?: string | null;
  existingDomains?: string[];
  onSubmit: (data: ConstraintFormSubmitData) => void;
  onNavigateToSettings: () => void;
}

type V2Behavior = 'checkpoint' | 'delay' | 'pin-required' | 'hard-block';

/**
 * Collapses the full behavior enum onto the four V2 values the picker
 * offers (BOOMRNG-V2-DESIGN-SPEC.md §11). Editing a constraint whose
 * stored behavior is a legacy value (progressive-delay, scheduled,
 * reflection, custom-message) pre-selects its closest V2 equivalent;
 * the stored value only actually changes if the user saves.
 */
function toV2Behavior(behavior: ConstraintBehavior): V2Behavior {
  switch (behavior) {
    case 'delay':
    case 'progressive-delay':
      return 'delay';
    case 'pin-required':
      return 'pin-required';
    case 'hard-block':
      return 'hard-block';
    default:
      return 'checkpoint';
  }
}

const BEHAVIORS: {
  value: V2Behavior;
  label: string;
  description: string;
  Icon: React.FC<IconProps>;
  friction: number;
}[] = [
  { value: 'checkpoint', label: 'Checkpoint', description: 'A quick pause before opening the site.', Icon: CheckpointIcon, friction: 1 },
  { value: 'delay', label: 'Delay', description: 'Wait for a time you choose before you can continue.', Icon: DelayIcon, friction: 2 },
  { value: 'pin-required', label: 'PIN Required', description: 'Enter your Boomrng PIN before continuing.', Icon: LockIcon, friction: 3 },
  { value: 'hard-block', label: 'Hard Block', description: 'No access while this constraint is active.', Icon: HardBlockIcon, friction: 4 },
];

export const ConstraintForm: React.FC<ConstraintFormProps> = ({
  mode,
  initialDomain = '',
  initialBehavior = 'checkpoint',
  initialDelayMinutes,
  initialIsPrivate = false,
  initialReason,
  existingDomains = [],
  onSubmit,
  onNavigateToSettings,
}) => {
  const [settings] = useSettings();
  const pinConfigured = Boolean(settings.pin);

  const [domain, setDomain] = useState(initialDomain);
  const [behavior, setBehavior] = useState<V2Behavior>(toV2Behavior(initialBehavior));
  const [delayMinutes, setDelayMinutes] = useState<number>(initialDelayMinutes ?? 15);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [reason, setReason] = useState(initialReason ?? '');
  // Collapsed by default when creating; a constraint that already has a
  // reason shows it expanded immediately rather than hiding real content.
  const [showReason, setShowReason] = useState(Boolean(initialReason));
  // Distinguishes "revealed just now by the user" from "already expanded
  // because it loaded with a value" — only the former should autofocus.
  const [reasonJustRevealed, setReasonJustRevealed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDomain(initialDomain);
    setBehavior(toV2Behavior(initialBehavior));
    setDelayMinutes(initialDelayMinutes ?? 15);
    setIsPrivate(initialIsPrivate);
    setReason(initialReason ?? '');
    setShowReason(Boolean(initialReason));
    setErrors({});
  }, [initialDomain, initialBehavior, initialDelayMinutes, initialIsPrivate, initialReason]);

  const validate = (): boolean => {
    const normalizedDomain = normalizeDomain(domain);
    const domainError: Record<string, string> = {};

    if (!normalizedDomain) {
      domainError.domain = 'Enter a valid domain (e.g., twitter.com)';
    } else if (existingDomains.some((d) => normalizeDomain(d) === normalizedDomain)) {
      // Re-normalizing each existing domain here (rather than comparing
      // against the raw stored strings directly) is what makes this guard
      // also catch a collision against legacy or imported data that
      // predates consistent domain normalization (BOOMRNG-V2-DESIGN-SPEC.md
      // §30.2) — a stored "WWW.Example.com" must still be recognized as
      // the same effective domain as a freshly-typed "example.com".
      domainError.domain = 'This domain already has a constraint';
    }

    const validation = validateConstraint(
      domain,
      behavior,
      behavior === 'delay' ? delayMinutes : undefined,
      undefined,
      pinConfigured
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
      delayMinutes: behavior === 'delay' ? delayMinutes : null,
      customMessage: reason.trim() || null,
      isPrivate,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Domain"
        placeholder="twitter.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        error={errors.domain}
        autoFocus={mode === 'add'}
      />

      <label className={styles.privacyToggle}>
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className={styles.privacyInput}
        />
        <span className={styles.toggleBox} aria-hidden="true" />
        <span>
          <span className={styles.toggleTitle}>Private constraint</span>
          <span className={styles.toggleHint}>Hide this site&rsquo;s domain from normal Boomrng screens.</span>
        </span>
      </label>

      <div className={styles.field}>
        <span className={styles.label}>Behavior</span>
        <div className={styles.behaviorList} role="radiogroup" aria-label="Behavior">
          {BEHAVIORS.map((b) => {
            const selected = behavior === b.value;
            return (
              <label
                key={b.value}
                className={`${styles.behaviorRow} ${selected ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="behavior"
                  value={b.value}
                  checked={selected}
                  onChange={() => setBehavior(b.value)}
                  className={styles.radioInput}
                />
                <span className={styles.rowTop}>
                  <span className={styles.radioDot} aria-hidden="true" />
                  <b.Icon className={styles.behaviorIcon} />
                  <span className={styles.behaviorName}>{b.label}</span>
                  <span className={styles.frictionDots} aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className={n <= b.friction ? styles.dotOn : styles.dot} />
                    ))}
                  </span>
                </span>
                {selected && (
                  <span className={styles.expand}>
                    <span className={styles.desc}>{b.description}</span>
                    {b.value === 'delay' && (
                      <span className={styles.configInline}>
                        <span className={styles.miniLabel}>Duration</span>
                        <span className={styles.stepper}>
                          <button
                            type="button"
                            onClick={() => setDelayMinutes((m) => Math.max(1, m - 5))}
                            aria-label="Decrease delay"
                          >
                            −
                          </button>
                          <span className={styles.stepperVal}>{delayMinutes} min</span>
                          <button
                            type="button"
                            onClick={() => setDelayMinutes((m) => Math.min(120, m + 5))}
                            aria-label="Increase delay"
                          >
                            +
                          </button>
                        </span>
                      </span>
                    )}
                    {b.value === 'pin-required' && !pinConfigured && (
                      <span className={styles.warning}>
                        No PIN set.{' '}
                        <button type="button" className={styles.warningAction} onClick={onNavigateToSettings}>
                          Set PIN
                        </button>
                      </span>
                    )}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {errors.behavior && <p className={styles.error}>{errors.behavior}</p>}
      </div>

      {showReason ? (
        <Input
          label="Remind yourself why (optional)"
          placeholder="I said I'd write, not scroll."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus={reasonJustRevealed}
        />
      ) : (
        <button
          type="button"
          className={styles.addReasonAction}
          onClick={() => {
            setShowReason(true);
            setReasonJustRevealed(true);
          }}
        >
          + Add a reason
        </button>
      )}

      <div className={styles.actions}>
        <Button type="submit" className={styles.submitButton}>
          {mode === 'add' ? 'Add constraint' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
};
