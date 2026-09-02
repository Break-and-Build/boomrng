export interface Settings {
  pin: string | null;
  tabBudget: number;
  landingPage: string;
  allowedSites: string[];
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  pin: null,
  tabBudget: 10,
  landingPage: '',
  allowedSites: ['localhost'],
  schemaVersion: 1,
};
