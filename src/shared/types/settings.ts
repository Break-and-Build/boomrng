export interface Settings {
  pin: string | null;
  tabBudget: number;
  allowedSites: string[];
  schemaVersion: number;
}

export const DEFAULT_SETTINGS: Settings = {
  pin: null,
  tabBudget: 10,
  allowedSites: ['localhost'],
  schemaVersion: 1,
};
