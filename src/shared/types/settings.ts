export interface Settings {
  pin: string | null;
  maxOverridesPerDay: number;
  requirePinAfter: number;
  tabBudget: number;
  landingPage: string;
  allowedSites: string[];
  strictMode: boolean;
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  pin: null,
  maxOverridesPerDay: 3,
  requirePinAfter: 2,
  tabBudget: 10,
  landingPage: 'https://github.com',
  allowedSites: ['localhost'],
  strictMode: false,
  schemaVersion: 1,
};
