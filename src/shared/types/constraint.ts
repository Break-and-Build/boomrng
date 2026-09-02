export type ConstraintBehavior =
  | 'checkpoint'
  | 'delay'
  | 'progressive-delay'
  | 'scheduled'
  | 'pin-required'
  | 'reflection'
  | 'hard-block'
  | 'custom-message';

export interface Constraint {
  id: string;
  domain: string;
  behavior: ConstraintBehavior;
  delayMinutes: number | null;
  schedule: ScheduleConfig | null;
  customMessage: string | null;
  createdAt: number;
  progressiveDelay: ProgressiveDelayState | null;
  /**
   * Data-model groundwork for Private Constraints (BOOMRNG-V2-DESIGN-SPEC.md §26).
   * Defaults to false and is normalized at load time in storage-service.ts so
   * constraints saved before this field existed keep working. No reveal/PIN
   * UI reads or sets this yet — that's a later milestone.
   */
  isPrivate: boolean;
}

export interface ScheduleConfig {
  from: string;
  to: string;
  days: number[];
}

export interface ProgressiveDelayState {
  level: number;
  delays: number[];
  expiresAt: number | null;
  attemptsToday: number;
  lastAttemptDate: string;
}

export interface ConstraintValidation {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
