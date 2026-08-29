export interface Settings {
  pin: string | null;
  maxOverridesPerDay: number;
  requirePinAfter: number;
  tabBudget: number;
  landingPage: string;
  allowedSites: string[];
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  pin: null,
  maxOverridesPerDay: 3,
  requirePinAfter: 2,
  tabBudget: 10,
  landingPage: '',
  allowedSites: ['localhost'],
  schemaVersion: 1,
};
