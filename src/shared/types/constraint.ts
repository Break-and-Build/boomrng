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
  enforcedToday: number;
  lastEnforcedAt: number | null;
  progressiveDelay: ProgressiveDelayState | null;
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
