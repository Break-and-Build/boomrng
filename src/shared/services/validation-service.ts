import type { ConstraintValidation, ValidationError, ConstraintBehavior } from '../types/constraint';
import { normalizeDomain } from '../utils/domain';

/**
 * `pinConfigured` is required, not optional — deliberately, so a caller
 * cannot forget to pass it and accidentally let a `pin-required`
 * constraint through with no PIN to enforce it against (the exact bug
 * this parameter exists to close at the business-logic level, not just
 * in the form's UI state).
 */
export function validateConstraint(
  domain: string,
  behavior: ConstraintBehavior,
  delayMinutes: number | undefined,
  customMessage: string | undefined,
  pinConfigured: boolean
): ConstraintValidation {
  const errors: ValidationError[] = [];

  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    errors.push({ field: 'domain', message: 'Enter a valid domain (e.g., twitter.com)' });
  }

  if ((behavior === 'delay' || behavior === 'progressive-delay')) {
    if (delayMinutes === undefined || delayMinutes === null) {
      errors.push({ field: 'delayMinutes', message: 'Delay duration is required' });
    } else if (delayMinutes < 1 || delayMinutes > 120) {
      errors.push({ field: 'delayMinutes', message: 'Delay must be between 1 and 120 minutes' });
    }
  }

  if (behavior === 'custom-message') {
    if (!customMessage || !customMessage.trim()) {
      errors.push({ field: 'customMessage', message: 'Enter a custom message' });
    } else if (customMessage.length > 500) {
      errors.push({ field: 'customMessage', message: 'Message must be under 500 characters' });
    }
  }

  if (behavior === 'pin-required' && !pinConfigured) {
    errors.push({ field: 'behavior', message: 'Set a Boomrng PIN before using PIN Required.' });
  }

  return { isValid: errors.length === 0, errors };
}

export function validatePin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateSchedule(
  from: string,
  to: string,
  days: number[]
): ConstraintValidation {
  const errors: ValidationError[] = [];

  if (!/^\d{2}:\d{2}$/.test(from)) {
    errors.push({ field: 'from', message: 'Invalid time format' });
  }

  if (!/^\d{2}:\d{2}$/.test(to)) {
    errors.push({ field: 'to', message: 'Invalid time format' });
  }

  if (from && to && from >= to) {
    errors.push({ field: 'schedule', message: 'Start time must be before end time' });
  }

  if (days.length === 0) {
    errors.push({ field: 'days', message: 'Select at least one day' });
  }

  return { isValid: errors.length === 0, errors };
}
