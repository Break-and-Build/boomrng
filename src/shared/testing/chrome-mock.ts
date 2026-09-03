/**
 * A minimal in-memory `chrome.*` mock for tests — the repository has no
 * real Chrome available under `vitest`, and the storage/DNR-adjacent
 * services under test call `chrome.storage.local`/`chrome.storage.session`
 * and reference `chrome.declarativeNetRequest`'s enum constants directly.
 * This is not a faithful DNR implementation (it can't verify an actual
 * browser redirect happens) — it exists only so pure logic that reads/
 * writes `chrome.storage.*` or reads the two enum values `rules-builder.ts`
 * embeds in its output can run and be asserted against.
 */

type StorageValue = unknown;
type StorageArea = Record<string, StorageValue>;
type ChangeListener = (
  changes: Record<string, { oldValue: StorageValue; newValue: StorageValue }>,
  areaName: string
) => void;

interface MockRule {
  id: number;
  priority?: number;
  action: { type: string; redirect?: { url?: string; regexSubstitution?: string } };
  condition: {
    regexFilter?: string;
    urlFilter?: string;
    tabIds?: number[];
    resourceTypes?: string[];
  };
}

interface MockAlarm {
  name: string;
  delayInMinutes?: number;
  periodInMinutes?: number;
  when?: number;
}

export interface ChromeMockHandle {
  store: StorageArea;
  /** Backing object for `chrome.storage.session` — separate from `store` (`chrome.storage.local`), same shape, since the two are genuinely distinct areas in real Chrome (`delay-authority-service.ts` deliberately uses `.session`, not `.local`). */
  sessionStore: StorageArea;
  /** Live view of the mock's current session rules — inspect directly rather than via an async getSessionRules() round-trip in tests. */
  sessionRules: Map<number, MockRule>;
  /** Live view of the mock's current alarms, keyed by name. */
  alarms: Map<string, MockAlarm>;
}

function makeStorageArea(store: StorageArea, listeners: ChangeListener[], areaName: string) {
  return {
    get(keys?: string | string[] | null): Promise<StorageArea> {
      return new Promise((resolve) => {
        if (keys === undefined || keys === null) {
          resolve({ ...store });
          return;
        }
        const keyList = Array.isArray(keys) ? keys : [keys];
        const result: StorageArea = {};
        for (const key of keyList) {
          if (key in store) result[key] = store[key];
        }
        resolve(result);
      });
    },
    set(items: StorageArea): Promise<void> {
      return new Promise((resolve) => {
        for (const [key, value] of Object.entries(items)) {
          const oldValue = store[key];
          store[key] = value;
          for (const listener of listeners) {
            listener({ [key]: { oldValue, newValue: value } }, areaName);
          }
        }
        resolve();
      });
    },
    remove(keys: string | string[]): Promise<void> {
      return new Promise((resolve) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          if (!(key in store)) continue;
          const oldValue = store[key];
          delete store[key];
          for (const listener of listeners) {
            listener({ [key]: { oldValue, newValue: undefined } }, areaName);
          }
        }
        resolve();
      });
    },
  };
}

export function installChromeMock(initial: StorageArea = {}): ChromeMockHandle {
  const store: StorageArea = { ...initial };
  const sessionStore: StorageArea = {};
  const listeners: ChangeListener[] = [];
  const sessionRules = new Map<number, MockRule>();
  const alarms = new Map<string, MockAlarm>();

  const local = makeStorageArea(store, listeners, 'local');
  const session = makeStorageArea(sessionStore, listeners, 'session');

  const chromeMock = {
    storage: {
      local,
      session,
      onChanged: {
        addListener(fn: ChangeListener) {
          listeners.push(fn);
        },
        removeListener(fn: ChangeListener) {
          const index = listeners.indexOf(fn);
          if (index >= 0) listeners.splice(index, 1);
        },
      },
    },
    declarativeNetRequest: {
      RuleActionType: { REDIRECT: 'redirect', ALLOW: 'allow' },
      ResourceType: { MAIN_FRAME: 'main_frame' },
      updateSessionRules(options: { removeRuleIds?: number[]; addRules?: MockRule[] }): Promise<void> {
        return new Promise((resolve) => {
          for (const id of options.removeRuleIds ?? []) {
            sessionRules.delete(id);
          }
          for (const rule of options.addRules ?? []) {
            sessionRules.set(rule.id, rule);
          }
          resolve();
        });
      },
      getSessionRules(): Promise<MockRule[]> {
        return Promise.resolve(Array.from(sessionRules.values()));
      },
      // Only what continuation-service.ts needs from the dynamic-rule
      // side for its own tests to run in isolation — not a general
      // dynamic-rules mock (rules-builder.test.ts installs its own bare
      // mock separately and doesn't need this).
      getDynamicRules(): Promise<MockRule[]> {
        return Promise.resolve([]);
      },
      updateDynamicRules(): Promise<void> {
        return Promise.resolve();
      },
    },
    alarms: {
      create(name: string, alarmInfo: Omit<MockAlarm, 'name'>): void {
        // Real chrome.alarms.create() replaces any existing alarm of the
        // same name outright — no duplicate, no error.
        alarms.set(name, { name, ...alarmInfo });
      },
      clear(name: string): Promise<boolean> {
        const existed = alarms.has(name);
        alarms.delete(name);
        return Promise.resolve(existed);
      },
      onAlarm: {
        addListener() {},
        removeListener() {},
      },
    },
  };

  (globalThis as unknown as { chrome: unknown }).chrome = chromeMock;

  return { store, sessionStore, sessionRules, alarms };
}

export function uninstallChromeMock(): void {
  delete (globalThis as unknown as { chrome?: unknown }).chrome;
}
