# Boomrng v2 — Engineering Architecture

> The complete engineering blueprint for building Boomrng v2.
> Every system designed. Every interface defined. Every decision documented.
>
> This document is the single source of truth for implementation.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Runtime Architecture](#2-runtime-architecture)
3. [Data Architecture](#3-data-architecture)
4. [Storage Architecture](#4-storage-architecture)
5. [Messaging Architecture](#5-messaging-architecture)
6. [Constraint Engine](#6-constraint-engine)
7. [Behavior Engine](#7-behavior-engine)
8. [Tab Budget Engine](#8-tab-budget-engine)
9. [Navigation Architecture](#9-navigation-architecture)
10. [State Management](#10-state-management)
11. [Error Handling](#11-error-handling)
12. [Performance Strategy](#12-performance-strategy)
13. [Security](#13-security)
14. [Testing Strategy](#14-testing-strategy)
15. [Folder Structure](#15-folder-structure)
16. [Dependency Graph](#16-dependency-graph)
17. [Implementation Order](#17-implementation-order)
18. [Engineering Principles](#18-engineering-principles)

---

## 1. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CHROME BROWSER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │     POPUP       │    │   BACKGROUND    │    │   ENFORCEMENT   │ │
│  │   (React App)   │    │  (Service       │    │     PAGES       │ │
│  │                 │    │   Worker)       │    │  (React Apps)   │ │
│  │  - Dashboard    │    │                 │    │                 │ │
│  │  - Sites        │    │  - Enforcement  │    │  - Checkpoint   │ │
│  │  - Settings     │    │  - Tab Manager  │    │  - Delay        │ │
│  │                 │    │  - Badge        │    │  - PIN          │ │
│  └────────┬────────┘    │  - Scheduler    │    │  - Hard Block   │ │
│           │             │  - Messenger    │    │  - Tab Budget   │ │
│           │             └────────┬────────┘    └────────┬────────┘ │
│           │                      │                      │          │
│           │                      │                      │          │
│  ┌────────▼──────────────────────▼──────────────────────▼────────┐ │
│  │                     CHROME APIS                                │ │
│  │  - chrome.storage.local                                        │ │
│  │  - chrome.storage.session                                      │ │
│  │  - chrome.tabs                                                 │ │
│  │  - chrome.alarms                                               │ │
│  │  - chrome.declarativeNetRequest                                │ │
│  │  - chrome.action                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Communication Flow

```
USER VISITS WEBSITE
        │
        ▼
┌───────────────────┐
│ declarativeNetRequest │──── Rule Match? ──── Yes ────┐
└───────────────────┘                                  │
                                                       ▼
                                                ┌─────────────┐
                                                │  Behavior    │
                                                │  Engine      │
                                                └──────┬──────┘
                                                       │
                        ┌──────────────────────────────┼──────────────────────────────┐
                        │                              │                              │
                        ▼                              ▼                              ▼
                ┌───────────────┐            ┌───────────────┐            ┌───────────────┐
                │  Checkpoint   │            │    Delay      │            │  Hard Block   │
                │  Page         │            │    Page       │            │  Page         │
                └───────────────┘            └───────────────┘            └───────────────┘
```

### Component Communication

```
┌─────────────┐     chrome.runtime.sendMessage     ┌─────────────┐
│             │ ──────────────────────────────────▶ │             │
│    POPUP    │                                     │  BACKGROUND │
│             │ ◀────────────────────────────────── │  WORKER     │
└─────────────┘     chrome.runtime.onMessage        └─────────────┘
       │                                                   │
       │ chrome.storage.local.set()                        │ chrome.storage.local.get()
       ▼                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CHROME STORAGE                              │
└─────────────────────────────────────────────────────────────────┘
       ▲                                                   ▲
       │ chrome.storage.onChanged                           │
       │                                                   │
┌─────────────┐                                     ┌─────────────┐
│             │     chrome.tabs.sendMessage          │             │
│  BACKGROUND │ ──────────────────────────────────▶ │ ENFORCEMENT │
│  WORKER     │                                     │ PAGES       │
│             │ ◀────────────────────────────────── │             │
└─────────────┘     chrome.runtime.onMessage        └─────────────┘
```

---

## 2. Runtime Architecture

### Popup

**Responsibilities:**
- Render Dashboard, Sites, Settings screens
- Handle user interactions
- Display constraint status
- Manage constraint CRUD operations
- Show tab budget status
- Toggle Strict Mode

**Lifecycle:**
1. `DOMContentLoaded` — Initialize React app
2. Load settings from `chrome.storage.local`
3. Subscribe to `chrome.storage.onChanged` for live updates
4. Render active screen
5. On close — cleanup subscriptions

**Communication:**
- Sends messages to Background for rule updates
- Reads/writes `chrome.storage.local`
- Listens to storage changes for real-time updates

**Dependencies:**
- React
- Storage service
- Message service
- All UI components

---

### Background Service Worker

**Responsibilities:**
- Enforce tab budget
- Update `declarativeNetRequest` rules
- Manage badge state
- Schedule alarm-based refreshes
- Handle messages from Popup and Enforcement Pages
- Track enforcement statistics

**Lifecycle:**
1. `chrome.runtime.onInstalled` — Initialize storage, sync state
2. `chrome.runtime.onStartup` — Sync state, refresh rules
3. `chrome.storage.onChanged` — Refresh enforcement rules
4. `chrome.tabs.onCreated` — Check tab budget
5. `chrome.tabs.onUpdated` — Check tab budget on URL change
6. `chrome.tabs.onRemoved` — Update badge
7. `chrome.alarms.onAlarm` — Refresh timer-based rules

**Communication:**
- Receives messages from Popup and Enforcement Pages
- Sends messages to Enforcement Pages
- Reads/writes `chrome.storage.local`
- Updates `chrome.declarativeNetRequest` rules
- Updates `chrome.action` badge

**Dependencies:**
- Constraint Engine
- Behavior Engine
- Tab Budget Engine
- Storage service
- Rules Builder

---

### Enforcement Pages

**Responsibilities:**
- Display enforcement UI (Checkpoint, Delay, PIN, Hard Block, Tab Budget)
- Handle user decisions (return to work, continue, submit PIN)
- Communicate with Background for validation

**Lifecycle:**
1. `DOMContentLoaded` — Initialize React app
2. Read query parameters (domain, pending URL, behavior)
3. Load relevant state from `chrome.storage.local`
4. Render enforcement screen
5. Handle user action
6. Navigate or close tab

**Communication:**
- Receives messages from Background
- Sends messages to Background for PIN validation
- Reads `chrome.storage.local`
- Navigates to original URL or uses `history.back()`

**Dependencies:**
- React
- Storage service
- Message service
- Specific enforcement screen component

---

## 3. Data Architecture

### Constraint

```typescript
interface Constraint {
  /** Unique identifier (UUID) */
  id: string;

  /** Normalized domain (e.g., "twitter.com") */
  domain: string;

  /** Enforcement behavior */
  behavior: ConstraintBehavior;

  /** Delay duration in minutes (only for "delay" and "progressive-delay") */
  delayMinutes: number | null;

  /** Schedule configuration (only for "scheduled") */
  schedule: ScheduleConfig | null;

  /** Custom message (only for "custom-message") */
  customMessage: string | null;

  /** Timestamp when constraint was created */
  createdAt: number;

  /** Number of times enforced today */
  enforcedToday: number;

  /** Timestamp of last enforcement */
  lastEnforcedAt: number | null;

  /** Progressive delay state */
  progressiveDelay: ProgressiveDelayState | null;
}

type ConstraintBehavior =
  | 'checkpoint'
  | 'delay'
  | 'progressive-delay'
  | 'scheduled'
  | 'pin-required'
  | 'reflection'
  | 'hard-block'
  | 'custom-message';
```

### ScheduleConfig

```typescript
interface ScheduleConfig {
  /** Start time in HH:mm format (e.g., "09:00") */
  from: string;

  /** End time in HH:mm format (e.g., "17:00") */
  to: string;

  /** Days of week (0 = Sunday, 6 = Saturday) */
  days: number[];
}
```

### ProgressiveDelayState

```typescript
interface ProgressiveDelayState {
  /** Current delay level (0 = first attempt) */
  level: number;

  /** Delays in minutes for each level */
  delays: number[];

  /** Timestamp when current delay expires */
  expiresAt: number | null;

  /** Number of attempts today */
  attemptsToday: number;

  /** Date of last attempt (YYYY-MM-DD) */
  lastAttemptDate: string;
}
```

### Settings

```typescript
interface Settings {
  /** PIN for protecting constraints (4-6 digits, stored as string) */
  pin: string | null;

  /** Maximum intentional overrides per day */
  maxOverridesPerDay: number;

  /** Require PIN after this many overrides in a day */
  requirePinAfter: number;

  /** Maximum number of tabs allowed */
  tabBudget: number;

  /** URL to redirect to when a constraint activates */
  landingPage: string;

  /** Domains that are never constrained */
  allowedSites: string[];

  /** Whether Strict Mode is active */
  strictMode: boolean;

  /** Schema version for migration */
  schemaVersion: number;
}
```

### OverrideSession

```typescript
interface OverrideSession {
  /** Domain that was overridden */
  domain: string;

  /** Timestamp when override was used */
  usedAt: number;

  /** Whether PIN was required for this override */
  pinRequired: boolean;
}
```

### EnforcementRecord

```typescript
interface EnforcementRecord {
  /** Date of records (YYYY-MM-DD) */
  date: string;

  /** Map of domain to enforcement count */
  enforcedCounts: Record<string, number>;

  /** Total overrides used today */
  overridesUsed: number;

  /** Timestamp of last enforcement */
  lastEnforcedAt: number | null;
}
```

### Validation Errors

```typescript
interface ValidationError {
  /** Field that failed validation */
  field: string;

  /** Error message */
  message: string;
}

interface ConstraintValidation {
  isValid: boolean;
  errors: ValidationError[];
}
```

---

## 4. Storage Architecture

### Storage Keys

```typescript
// storage.local keys
const STORAGE_KEYS = {
  // Settings
  SETTINGS: 'settings',

  // Constraints
  CONSTRAINTS: 'constraints',

  // Enforcement records
  ENFORCEMENT_RECORDS: 'enforcementRecords',

  // Override sessions (today's overrides)
  OVERRIDE_SESSIONS: 'overrideSessions',

  // Schema version
  SCHEMA_VERSION: 'schemaVersion',
} as const;

// storage.session keys (temporary, cleared on browser restart)
const SESSION_KEYS = {
  // Tab count cache
  TAB_COUNT_CACHE: 'tabCountCache',

  // Last badge update timestamp
  LAST_BADGE_UPDATE: 'lastBadgeUpdate',
} as const;
```

### Storage Structure

```
chrome.storage.local
├── settings: Settings
├── constraints: Constraint[]
├── enforcementRecords: Record<string, EnforcementRecord>
├── overrideSessions: OverrideSession[]
└── schemaVersion: number

chrome.storage.session
├── tabCountCache: { count: number, timestamp: number }
└── lastBadgeUpdate: number
```

### Synchronization Strategy

**Storage Changes → Enforcement Rules:**

```
chrome.storage.onChanged
    │
    ▼
Background Service Worker
    │
    ├── If constraints changed → Refresh declarativeNetRequest rules
    ├── If settings changed → Refresh badge, tab budget
    └── If enforcement records changed → No action needed
```

**Storage Changes → Popup Updates:**

```
chrome.storage.onChanged
    │
    ▼
Popup (subscribed via chrome.storage.onChanged)
    │
    └── Re-render affected components
```

### Hydration

```typescript
// Load settings with defaults
async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...data[STORAGE_KEYS.SETTINGS],
  };
}

// Load constraints with defaults
async function loadConstraints(): Promise<Constraint[]> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.CONSTRAINTS);
  return data[STORAGE_KEYS.CONSTRAINTS] || [];
}

// Default settings
const DEFAULT_SETTINGS: Settings = {
  pin: null,
  maxOverridesPerDay: 3,
  requirePinAfter: 2,
  tabBudget: 10,
  landingPage: 'https://github.com',
  allowedSites: ['localhost'],
  strictMode: false,
  schemaVersion: 1,
};
```

### Migration Strategy

```typescript
// Schema version management
const CURRENT_SCHEMA_VERSION = 1;

async function migrateStorage(): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SCHEMA_VERSION);
  const currentVersion = data[STORAGE_KEYS.SCHEMA_VERSION] || 0;

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    // Run migrations in order
    for (let v = currentVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
      await runMigration(v);
    }

    // Update version
    await chrome.storage.local.set({
      [STORAGE_KEYS.SCHEMA_VERSION]: CURRENT_SCHEMA_VERSION,
    });
  }
}

async function runMigration(version: number): Promise<void> {
  switch (version) {
    case 1:
      // Migrate from v0 format
      await migrateV0toV1();
      break;
    // Future migrations
  }
}
```

### Import/Export

```typescript
interface ExportData {
  version: number;
  exportedAt: number;
  settings: Settings;
  constraints: Constraint[];
}

// Export
async function exportData(): Promise<string> {
  const settings = await loadSettings();
  const constraints = await loadConstraints();

  const exportData: ExportData = {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    settings,
    constraints,
  };

  return JSON.stringify(exportData, null, 2);
}

// Import
async function importData(jsonString: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const data = JSON.parse(jsonString) as ExportData;

    // Validate structure
    if (!data.version || !data.settings || !data.constraints) {
      return { success: false, error: 'Invalid export format' };
    }

    // Validate each constraint
    for (const constraint of data.constraints) {
      const validation = validateConstraint(constraint);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid constraint: ${validation.errors[0].message}`,
        };
      }
    }

    // Apply
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: data.settings,
      [STORAGE_KEYS.CONSTRAINTS]: data.constraints,
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to parse JSON' };
  }
}
```

### Conflict Handling

Chrome Storage does not support conflict resolution. For Boomrng:

- **Single-writer rule:** Only the Popup modifies settings. Background reads only.
- **Last-write-wins:** If multiple Popup instances are open, last save wins.
- **No merging:** Settings are replaced, not merged.

### Performance Considerations

1. **Batch writes:** Group multiple storage changes into a single `set()` call.
2. **Debounce saves:** Wait 300ms after last change before writing.
3. **Read caching:** Cache settings in memory, invalidate on `storage.onChanged`.
4. **Minimize reads:** Load settings once on popup open, subscribe to changes.

---

## 5. Messaging Architecture

### Message Types

```typescript
// Message types from Popup → Background
type PopupMessage =
  | { type: 'REFRESH_RULES' }
  | { type: 'UPDATE_BADGE' }
  | { type: 'VALIDATE_PIN'; pin: string }
  | { type: 'GET_TAB_COUNT' }
  | { type: 'SET_STRICT_MODE'; active: boolean };

// Message types from Background → Enforcement Pages
type EnforcementMessage =
  | { type: 'PIN_VALID'; domain: string }
  | { type: 'PIN_INVALID'; domain: string }
  | { type: 'DELAY_EXPIRED'; domain: string };

// Message types from Enforcement Pages → Background
type EnforcementPageMessage =
  | { type: 'VALIDATE_PIN'; pin: string; domain: string }
  | { type: 'REQUEST_CONTINUE'; domain: string }
  | { type: 'TAB_CLOSED'; tabId: number };

// Response types
type MessageResponse =
  | { success: true; data?: unknown }
  | { success: false; error: string };
```

### Message Handler

```typescript
// Background message handler
chrome.runtime.onMessage.addListener(
  (
    message: PopupMessage | EnforcementPageMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    // Handle message asynchronously
    handleMessage(message, sender)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    // Return true to indicate async response
    return true;
  }
);

async function handleMessage(
  message: PopupMessage | EnforcementPageMessage,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case 'REFRESH_RULES':
      await refreshEnforcementRules();
      return null;

    case 'UPDATE_BADGE':
      await updateBadge();
      return null;

    case 'VALIDATE_PIN':
      return await validatePin(message.pin);

    case 'GET_TAB_COUNT':
      return await getTabCount();

    case 'SET_STRICT_MODE':
      await setStrictMode(message.active);
      return null;

    case 'VALIDATE_PIN':
      const isValid = await validatePin(message.pin);
      return { valid: isValid };

    case 'REQUEST_CONTINUE':
      await recordEnforcement(message.domain);
      return null;

    case 'TAB_CLOSED':
      await updateBadge();
      return null;
  }
}
```

### Message Service (Popup/Enforcement Pages)

```typescript
// Unified message sending
async function sendMessage(
  message: PopupMessage | EnforcementPageMessage
): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message || 'Message failed',
        });
      } else {
        resolve(response);
      }
    });
  });
}

// Example usage
async function refreshRules(): Promise<void> {
  const response = await sendMessage({ type: 'REFRESH_RULES' });
  if (!response.success) {
    console.error('Failed to refresh rules:', response.error);
  }
}
```

### Timeout Handling

```typescript
// Message with timeout
async function sendMessageWithTimeout(
  message: PopupMessage | EnforcementPageMessage,
  timeoutMs: number = 5000
): Promise<MessageResponse> {
  return Promise.race([
    sendMessage(message),
    new Promise<MessageResponse>((resolve) =>
      setTimeout(
        () => resolve({ success: false, error: 'Message timeout' }),
        timeoutMs
      )
    ),
  ]);
}
```

---

## 6. Constraint Engine

### Purpose

The Constraint Engine determines what happens when a user visits a website. It evaluates constraints, applies behaviors, and returns the appropriate enforcement action.

### Evaluation Order

```
1. Check if extension is enabled
   └── If disabled → Allow

2. Check if domain is in Always Allowed list
   └── If allowed → Allow

3. Find matching constraint for domain
   └── If no constraint → Allow

4. Check if Strict Mode is active
   └── If active → Convert behavior to "hard-block"

5. Evaluate behavior
   ├── checkpoint → Return "checkpoint" action
   ├── delay → Check if delay is active
   │   ├── Active → Return "delay" action
   │   └── Expired → Allow
   ├── progressive-delay → Check current level
   │   ├── Delay active → Return "delay" action
   │   └── No delay → Return "checkpoint" action
   ├── scheduled → Check if within schedule
   │   ├── Within schedule → Return "hard-block" action
   │   └── Outside schedule → Allow
   ├── pin-required → Return "pin-required" action
   ├── reflection → Return "reflection" action
   ├── hard-block → Return "hard-block" action
   └── custom-message → Return "custom-message" action

6. Record enforcement
```

### Implementation

```typescript
// Constraint Engine
class ConstraintEngine {
  private settings: Settings;
  private constraints: Constraint[];
  private enforcementRecords: EnforcementRecord;

  constructor(
    settings: Settings,
    constraints: Constraint[],
    enforcementRecords: EnforcementRecord
  ) {
    this.settings = settings;
    this.constraints = constraints;
    this.enforcementRecords = enforcementRecords;
  }

  evaluate(domain: string): EnforcementAction {
    // 1. Check if enabled
    if (!this.isEnabled()) {
      return { type: 'allow' };
    }

    // 2. Check Always Allowed
    if (this.isAlwaysAllowed(domain)) {
      return { type: 'allow' };
    }

    // 3. Find matching constraint
    const constraint = this.findConstraint(domain);
    if (!constraint) {
      return { type: 'allow' };
    }

    // 4. Check Strict Mode
    if (this.settings.strictMode) {
      return this.enforceHardBlock(domain);
    }

    // 5. Evaluate behavior
    return this.evaluateBehavior(constraint, domain);
  }

  private isEnabled(): boolean {
    return this.settings !== null;
  }

  private isAlwaysAllowed(domain: string): boolean {
    return this.settings.allowedSites.includes(domain);
  }

  private findConstraint(domain: string): Constraint | undefined {
    return this.constraints.find((c) => c.domain === domain);
  }

  private evaluateBehavior(
    constraint: Constraint,
    domain: string
  ): EnforcementAction {
    switch (constraint.behavior) {
      case 'checkpoint':
        return { type: 'checkpoint', domain };

      case 'delay':
        return this.evaluateDelay(constraint, domain);

      case 'progressive-delay':
        return this.evaluateProgressiveDelay(constraint, domain);

      case 'scheduled':
        return this.evaluateScheduled(constraint, domain);

      case 'pin-required':
        return { type: 'pin-required', domain };

      case 'reflection':
        return { type: 'reflection', domain };

      case 'hard-block':
        return { type: 'hard-block', domain };

      case 'custom-message':
        return {
          type: 'custom-message',
          domain,
          message: constraint.customMessage || '',
        };
    }
  }

  private evaluateDelay(
    constraint: Constraint,
    domain: string
  ): EnforcementAction {
    // Check if delay is currently active
    const record = this.enforcementRecords.enforcedCounts[domain];
    if (record && constraint.delayMinutes) {
      const lastEnforced = record.lastEnforcedAt;
      if (lastEnforced) {
        const elapsed = Date.now() - lastEnforced;
        const remaining = constraint.delayMinutes * 60 * 1000 - elapsed;
        if (remaining > 0) {
          return { type: 'delay', domain, remainingMs: remaining };
        }
      }
    }
    // Delay expired or not started
    return { type: 'checkpoint', domain };
  }

  private evaluateProgressiveDelay(
    constraint: Constraint,
    domain: string
  ): EnforcementAction {
    const state = constraint.progressiveDelay;
    if (!state) {
      return { type: 'checkpoint', domain };
    }

    // Check if current delay is active
    if (state.expiresAt && state.expiresAt > Date.now()) {
      return {
        type: 'delay',
        domain,
        remainingMs: state.expiresAt - Date.now(),
      };
    }

    // No active delay, return checkpoint
    return { type: 'checkpoint', domain };
  }

  private evaluateScheduled(
    constraint: Constraint,
    domain: string
  ): EnforcementAction {
    const schedule = constraint.schedule;
    if (!schedule) {
      return { type: 'allow' };
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if today is in schedule
    if (!schedule.days.includes(currentDay)) {
      return { type: 'allow' };
    }

    // Check if current time is within schedule
    if (currentTime >= schedule.from && currentTime <= schedule.to) {
      return { type: 'hard-block', domain };
    }

    return { type: 'allow' };
  }

  private enforceHardBlock(domain: string): EnforcementAction {
    return { type: 'hard-block', domain };
  }
}

// Enforcement action type
type EnforcementAction =
  | { type: 'allow' }
  | { type: 'checkpoint'; domain: string }
  | { type: 'delay'; domain: string; remainingMs: number }
  | { type: 'pin-required'; domain: string }
  | { type: 'reflection'; domain: string }
  | { type: 'hard-block'; domain: string }
  | { type: 'custom-message'; domain: string; message: string };
```

### Caching

```typescript
// Cache constraint evaluations
const evaluationCache = new Map<string, { action: EnforcementAction; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

function getCachedEvaluation(domain: string): EnforcementAction | null {
  const cached = evaluationCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.action;
  }
  return null;
}

function setCachedEvaluation(domain: string, action: EnforcementAction): void {
  evaluationCache.set(domain, { action, timestamp: Date.now() });
}
```

---

## 7. Behavior Engine

### Checkpoint

**Inputs:**
- `domain: string`

**Outputs:**
- Redirect to `checkpoint.html?domain={domain}`

**State:**
- None (stateless)

**Timing:**
- Immediate redirect

**Failure Cases:**
- If checkpoint.html fails to load → Show error page

**Recovery:**
- User clicks "Return to work" → `history.back()` or close tab
- User clicks "Continue anyway" → Navigate to original domain

---

### Delay

**Inputs:**
- `domain: string`
- `delayMinutes: number`
- `remainingMs: number` (if delay is active)

**Outputs:**
- Redirect to `delay.html?domain={domain}&remaining={remainingMs}`

**State:**
- `enforcementRecords[domain].lastEnforcedAt` — When delay started
- `constraint.delayMinutes` — Delay duration

**Timing:**
- Delay starts on first enforcement
- Delay expires after `delayMinutes`
- If user visits again during delay → Show delay page

**Failure Cases:**
- Storage failure → Allow access (fail open)
- Timer drift → Use server time comparison

**Recovery:**
- Wait for delay to expire
- No manual override available

---

### Progressive Delay

**Inputs:**
- `domain: string`
- `progressiveDelay: ProgressiveDelayState`

**Outputs:**
- Redirect to delay page with appropriate duration

**State:**
- `progressiveDelay.level` — Current delay level
- `progressiveDelay.attemptsToday` — Attempts counter
- `progressiveDelay.lastAttemptDate` — For daily reset

**Timing:**
- Level 0: 5 minutes
- Level 1: 15 minutes
- Level 2: 30 minutes
- Level 3+: 60 minutes (capped)
- Resets daily

**Failure Cases:**
- Corrupt state → Reset to level 0
- Storage failure → Allow access (fail open)

**Recovery:**
- Wait for current delay to expire
- Next attempt increases level

---

### PIN Required

**Inputs:**
- `domain: string`
- `pin: string` (user input)

**Outputs:**
- Redirect to `pin.html?domain={domain}`

**State:**
- `settings.pin` — Stored PIN
- `overrideSessions` — Today's overrides

**Timing:**
- Immediate redirect to PIN page
- PIN validation on submission

**Failure Cases:**
- Incorrect PIN → Show error
- PIN not set → Treat as hard block
- Storage failure → Allow access (fail open)

**Recovery:**
- Enter correct PIN
- Return to work

---

### Hard Block

**Inputs:**
- `domain: string`

**Outputs:**
- Redirect to `hardblock.html?domain={domain}`

**State:**
- None (stateless)

**Timing:**
- Immediate redirect

**Failure Cases:**
- If hardblock.html fails to load → Show generic block page

**Recovery:**
- No recovery (by design)
- User must remove constraint to access site

---

### Scheduled

**Inputs:**
- `domain: string`
- `schedule: ScheduleConfig`

**Outputs:**
- Allow or block based on schedule

**State:**
- `constraint.schedule` — Schedule configuration

**Timing:**
- Evaluated in real-time
- No caching (schedule changes with time)

**Failure Cases:**
- Invalid schedule format → Allow access
- Storage failure → Allow access (fail open)

**Recovery:**
- Wait until outside scheduled hours

---

### Reflection

**Inputs:**
- `domain: string`

**Outputs:**
- Redirect to `reflection.html?domain={domain}&duration=5000`

**State:**
- None (stateless)

**Timing:**
- Show calm page for 5-10 seconds
- Then redirect to domain

**Failure Cases:**
- If reflection.html fails → Allow access
- If user closes tab during reflection → No action

**Recovery:**
- Wait for reflection period to end
- Site loads automatically

---

### Custom Message

**Inputs:**
- `domain: string`
- `message: string`

**Outputs:**
- Redirect to `custommessage.html?domain={domain}&message={encoded}`

**State:**
- `constraint.customMessage` — User-defined message

**Timing:**
- Show message for 5 seconds
- Then redirect to domain

**Failure Cases:**
- Empty message → Treat as checkpoint
- If custommessage.html fails → Allow access

**Recovery:**
- Wait for message period to end
- Site loads automatically

---

## 8. Tab Budget Engine

### Tab Counting

```typescript
class TabBudgetEngine {
  async getTabCount(): Promise<number> {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.length;
  }

  async getTabBudget(): Promise<number> {
    const settings = await loadSettings();
    return settings.tabBudget;
  }

  async isOverBudget(): Promise<boolean> {
    const count = await this.getTabCount();
    const budget = await this.getTabBudget();
    return budget > 0 && count > budget;
  }

  async getTabsOverBudget(): Promise<number> {
    const count = await this.getTabCount();
    const budget = await this.getTabBudget();
    return Math.max(0, count - budget);
  }
}
```

### Oldest Tab Detection

```typescript
async function getOldestTabs(count: number): Promise<chrome.tabs.Tab[]> {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  // Exclude system tabs and the current tab
  const closeableTabs = tabs.filter(
    (tab) =>
      tab.id !== chrome.tabs.TAB_ID_NONE &&
      tab.url &&
      !tab.url.startsWith('chrome://') &&
      !tab.url.startsWith('chrome-extension://')
  );

  // Sort by creation time (oldest first)
  closeableTabs.sort((a, b) => {
    const aTime = a.id ? getTabCreationTime(a.id) : 0;
    const bTime = b.id ? getTabCreationTime(b.id) : 0;
    return aTime - bTime;
  });

  return closeableTabs.slice(0, count);
}

// Estimate tab creation time from tab ID
// (Chrome doesn't expose creation time directly)
function getTabCreationTime(tabId: number): number {
  // Tab IDs are generally sequential
  // Lower ID = older tab
  return tabId;
}
```

### Excluded Tabs

```typescript
function shouldExcludeTab(tab: chrome.tabs.Tab): boolean {
  // Exclude system pages
  if (tab.url?.startsWith('chrome://')) return true;
  if (tab.url?.startsWith('chrome-extension://')) return true;

  // Exclude Chrome Web Store
  if (tab.url?.startsWith('https://chromewebstore.google.com')) return true;

  // Exclude enforcement pages
  if (tab.url?.includes('checkpoint.html')) return true;
  if (tab.url?.includes('delay.html')) return true;
  if (tab.url?.includes('pin.html')) return true;
  if (tab.url?.includes('hardblock.html')) return true;
  if (tab.url?.includes('tabbudget.html')) return true;

  // Exclude pinned tabs (optional, configurable)
  if (tab.pinned) return true;

  return false;
}
```

### Window Handling

```typescript
// Only count tabs in the current window
async function getCurrentWindowTabCount(): Promise<number> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.filter((tab) => !shouldExcludeTab(tab)).length;
}

// Handle multiple windows
async function getAllWindowsTabCount(): Promise<number> {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => !shouldExcludeTab(tab)).length;
}
```

### Performance

```typescript
// Cache tab count
let cachedTabCount: { count: number; timestamp: number } | null = null;
const TAB_COUNT_CACHE_TTL = 1000; // 1 second

async function getTabCountCached(): Promise<number> {
  if (
    cachedTabCount &&
    Date.now() - cachedTabCount.timestamp < TAB_COUNT_CACHE_TTL
  ) {
    return cachedTabCount.count;
  }

  const count = await getCurrentWindowTabCount();
  cachedTabCount = { count, timestamp: Date.now() };
  return count;
}

// Invalidate cache on tab events
chrome.tabs.onCreated.addListener(() => {
  cachedTabCount = null;
});

chrome.tabs.onRemoved.addListener(() => {
  cachedTabCount = null;
});
```

### Edge Cases

1. **Tab closes during enforcement:** Retry enforcement after brief delay.
2. **Window switch:** Recount tabs for new window.
3. **Tab duplicates:** Count each tab individually.
4. **Tab restore:** Count restored tabs in budget.
5. **Extension reload:** Clear all caches, reinitialize.

---

## 9. Navigation Architecture

### Popup Routing

```typescript
// Simple hash-based routing
type Screen = 'dashboard' | 'sites' | 'settings';

function getScreenFromHash(): Screen {
  const hash = window.location.hash.slice(1) as Screen;
  return ['dashboard', 'sites', 'settings'].includes(hash) ? hash : 'dashboard';
}

function setScreen(screen: Screen): void {
  window.location.hash = screen;
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
  const screen = getScreenFromHash();
  renderScreen(screen);
});
```

### Enforcement Routing

```typescript
// Query parameter based routing
interface EnforcementParams {
  domain: string;
  pending?: string; // Original URL to navigate to
  remaining?: string; // Delay remaining in ms
  message?: string; // Custom message
}

function getEnforcementParams(): EnforcementParams {
  const params = new URLSearchParams(window.location.search);
  return {
    domain: params.get('domain') || '',
    pending: params.get('pending') || undefined,
    remaining: params.get('remaining') || undefined,
    message: params.get('message') || undefined,
  };
}
```

### Modal Routing

```typescript
// Modal state managed in React
interface ModalState {
  addConstraint: boolean;
  editConstraint: boolean;
  deleteConstraint: boolean;
  pinSetup: boolean;
  confirmation: boolean;
}

// No URL-based routing for modals
// Modals are state-driven, not route-driven
```

### Back Navigation

```typescript
// Enforcement pages use history.back()
function goBack(): void {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

// Popup uses hash changes
function navigateTo(screen: Screen): void {
  setScreen(screen);
}
```

---

## 10. State Management

### State Categories

| Category | Location | Lifetime | Example |
|---|---|---|---|
| **UI State** | React component state | Component mount | `isModalOpen`, `activeFilter` |
| **Storage State** | `chrome.storage.local` | Persistent | `settings`, `constraints` |
| **Runtime State** | `chrome.storage.session` | Browser session | `tabCountCache` |
| **Session State** | In-memory | Popup lifetime | `countdownInterval` |
| **Derived State** | Computed from storage | Recomputed on change | `activeConstraints`, `enforcedToday` |

### State Update Flow

```
User Action
    │
    ▼
React Component
    │
    ├── Update UI state (setState)
    │
    └── Call storage service
            │
            ▼
        chrome.storage.local.set()
            │
            ▼
        chrome.storage.onChanged
            │
            ├── Background Service Worker
            │   ├── Refresh enforcement rules
            │   └── Update badge
            │
            └── Popup (if open)
                └── Recompute derived state
                    └── Re-render affected components
```

### Avoiding Duplicated State

```typescript
// BAD: Duplicated state
const [constraints, setConstraints] = useState<Constraint[]>([]);
const [activeCount, setActiveCount] = useState(0);

// GOOD: Derived state
const [constraints, setConstraints] = useState<Constraint[]>([]);
const activeCount = constraints.filter((c) => isActive(c)).length;
```

### State Hooks

```typescript
// Custom hook for storage state
function useStorageState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Load initial value
  useEffect(() => {
    chrome.storage.local.get(key, (data) => {
      if (data[key] !== undefined) {
        setValue(data[key]);
      }
    });
  }, [key]);

  // Subscribe to changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setValue(changes[key].newValue);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key]);

  // Update function
  const updateValue = useCallback(
    (newValue: T) => {
      chrome.storage.local.set({ [key]: newValue });
    },
    [key]
  );

  return [value, updateValue];
}

// Usage
const [settings, setSettings] = useStorageState<Settings>('settings', DEFAULT_SETTINGS);
const [constraints, setConstraints] = useStorageState<Constraint[]>('constraints', []);
```

---

## 11. Error Handling

### Error Categories

| Category | Example | Handling |
|---|---|---|
| **Validation** | Invalid domain format | Show inline error |
| **Storage** | `chrome.storage.local.set` fails | Retry once, then show error toast |
| **Chrome API** | `chrome.tabs.query` fails | Fail silently, use cached value |
| **Permission** | Missing `tabs` permission | Show error, request permission |
| **Corrupt Data** | Invalid settings structure | Reset to defaults |
| **Runtime** | Unexpected JavaScript error | Log to console, show error boundary |

### Error Handler

```typescript
// Centralized error handling
class ErrorHandler {
  static handle(error: unknown, context: string): void {
    console.error(`[boomrng] ${context}:`, error);

    // Show user-facing error if needed
    if (this.isCriticalError(error)) {
      this.showErrorToast(context);
    }
  }

  private static isCriticalError(error: unknown): boolean {
    if (error instanceof Error) {
      // Storage errors are critical
      if (error.message.includes('storage')) return true;
      // Permission errors are critical
      if (error.message.includes('permission')) return true;
    }
    return false;
  }

  private static showErrorToast(context: string): void {
    // Dispatch toast event
    window.dispatchEvent(
      new CustomEvent('boomrng:toast', {
        detail: {
          message: `Something went wrong. Please try again.`,
          variant: 'error',
        },
      })
    );
  }
}
```

### Recovery Behavior

```typescript
// Fail open for enforcement (privacy consideration)
async function evaluateWithRecovery(
  domain: string
): Promise<EnforcementAction> {
  try {
    return await constraintEngine.evaluate(domain);
  } catch (error) {
    ErrorHandler.handle(error, 'Constraint evaluation failed');
    // Fail open: allow access on error
    return { type: 'allow' };
  }
}

// Fail closed for storage writes
async function saveWithRecovery<T>(
  key: string,
  value: T
): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (error) {
    ErrorHandler.handle(error, 'Storage write failed');
    // Show error to user
    return false;
  }
}
```

---

## 12. Performance Strategy

### Lazy Loading

```typescript
// Lazy load enforcement pages
const CheckpointScreen = React.lazy(() => import('./enforcement/CheckpointScreen'));
const DelayScreen = React.lazy(() => import('./enforcement/DelayScreen'));
const PinScreen = React.lazy(() => import('./enforcement/PinScreen'));

// Lazy load screens in popup
const Dashboard = React.lazy(() => import('./screens/Dashboard'));
const Sites = React.lazy(() => import('./screens/Sites'));
const Settings = React.lazy(() => import('./screens/Settings'));
```

### Memoization

```typescript
// Memoize expensive computations
const activeConstraints = useMemo(() => {
  return constraints.filter((c) => isActive(c));
}, [constraints]);

// Memoize callbacks
const handleEdit = useCallback((id: string) => {
  setEditingId(id);
  setShowEditModal(true);
}, []);

// Memoize components
const ConstraintRow = React.memo(({ constraint, onEdit, onRemove }) => {
  // Component implementation
});
```

### Storage Batching

```typescript
// Batch multiple storage writes
class StorageBatcher {
  private pendingWrites: Map<string, unknown> = new Map();
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;

  set(key: string, value: unknown): void {
    this.pendingWrites.set(key, value);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) return;

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, 100);
  }

  private async flush(): Promise<void> {
    const writes = Object.fromEntries(this.pendingWrites);
    this.pendingWrites.clear();
    this.flushTimeout = null;

    try {
      await chrome.storage.local.set(writes);
    } catch (error) {
      ErrorHandler.handle(error, 'Batched storage write failed');
    }
  }
}

// Usage
const batcher = new StorageBatcher();
batcher.set('settings', newSettings);
batcher.set('constraints', newConstraints);
// Both written in single chrome.storage.local.set() call
```

### Avoiding Unnecessary Renders

```typescript
// Use React.memo for pure components
const Badge = React.memo(({ variant, children }: BadgeProps) => {
  return <span className={`badge badge-${variant}`}>{children}</span>;
});

// Use useMemo for expensive computations
const sortedConstraints = useMemo(() => {
  return [...constraints].sort((a, b) => a.domain.localeCompare(b.domain));
}, [constraints]);

// Use useCallback for event handlers
const handleRemove = useCallback((id: string) => {
  removeConstraint(id);
}, []);
```

### Startup Performance

```typescript
// Minimal initial load
// 1. Load settings (required)
// 2. Load constraints (required)
// 3. Load enforcement records (deferred)

async function initializePopup(): Promise<void> {
  // Critical: Load settings and constraints
  const [settings, constraints] = await Promise.all([
    loadSettings(),
    loadConstraints(),
  ]);

  // Set initial state
  setSettings(settings);
  setConstraints(constraints);

  // Defer: Load enforcement records
  requestIdleCallback(async () => {
    const records = await loadEnforcementRecords();
    setEnforcementRecords(records);
  });
}
```

---

## 13. Security

### PIN Storage

```typescript
// PIN is stored as plain text in chrome.storage.local
// This is acceptable because:
// 1. PIN protects against accidental overrides, not malicious access
// 2. chrome.storage.local is sandboxed to the extension
// 3. No server-side storage means no transmission risk
// 4. PIN is 4-6 digits, not a password

// For additional protection, we could hash the PIN
// But this adds complexity without meaningful security gain
```

### Data Privacy

```typescript
// Boomrng stores NO user data that could be used for tracking
// All data is local to the browser
// No network requests (except for declarativeNetRequest redirect)
// No analytics, no telemetry, no accounts

// Constraints are domain strings, not browsing history
// Enforcement records are counts, not timestamps of visits
// No URLs are stored (only domains)
```

### Extension Permissions

```json
{
  "permissions": [
    "storage",           // Read/write settings
    "tabs",              // Query tabs for budget
    "declarativeNetRequest", // Block/redirect sites
    "alarms"             // Schedule rule refreshes
  ],
  "host_permissions": ["<all_urls>"]
}
```

### Input Sanitization

```typescript
// Domain normalization
function normalizeDomain(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value || /\s/.test(value)) return null;

  // Remove protocol
  const withoutProtocol = value.replace(/^https?:\/\//, '');

  // Remove www prefix
  const withoutWww = withoutProtocol.replace(/^www\./, '');

  // Validate domain format
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(withoutWww)) {
    return null;
  }

  return withoutWww;
}

// PIN validation
function validatePinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// URL validation
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

### Safe Defaults

```typescript
// All features are opt-in, not opt-out
// Tab budget defaults to 0 (no limit)
// PIN is not set by default
// Strict Mode is off by default
// All constraints must be explicitly created

// Fail-open for enforcement (privacy consideration)
// If enforcement fails, allow access
// Better to allow one unwanted visit than to block all browsing
```

---

## 14. Testing Strategy

### Testing Layers

```
┌─────────────────────────────────────────────────────────┐
│                    E2E Tests                             │
│  Full user flows across multiple components             │
├─────────────────────────────────────────────────────────┤
│                 Integration Tests                        │
│  Component interactions, storage operations             │
├─────────────────────────────────────────────────────────┤
│                   Unit Tests                             │
│  Individual functions, utilities, engines               │
└─────────────────────────────────────────────────────────┘
```

### Unit Tests

```typescript
// Testing constraint engine
describe('ConstraintEngine', () => {
  it('should allow when extension is disabled', () => {
    const engine = new ConstraintEngine(
      { ...DEFAULT_SETTINGS, enabled: false },
      [],
      EMPTY_RECORDS
    );
    const action = engine.evaluate('twitter.com');
    expect(action).toEqual({ type: 'allow' });
  });

  it('should checkpoint when constraint exists', () => {
    const engine = new ConstraintEngine(
      DEFAULT_SETTINGS,
      [{ id: '1', domain: 'twitter.com', behavior: 'checkpoint', ... }],
      EMPTY_RECORDS
    );
    const action = engine.evaluate('twitter.com');
    expect(action).toEqual({ type: 'checkpoint', domain: 'twitter.com' });
  });

  it('should hard-block in strict mode', () => {
    const engine = new ConstraintEngine(
      { ...DEFAULT_SETTINGS, strictMode: true },
      [{ id: '1', domain: 'twitter.com', behavior: 'delay', ... }],
      EMPTY_RECORDS
    );
    const action = engine.evaluate('twitter.com');
    expect(action).toEqual({ type: 'hard-block', domain: 'twitter.com' });
  });
});

// Testing domain normalization
describe('normalizeDomain', () => {
  it('should normalize twitter.com', () => {
    expect(normalizeDomain('twitter.com')).toBe('twitter.com');
  });

  it('should remove www prefix', () => {
    expect(normalizeDomain('www.twitter.com')).toBe('twitter.com');
  });

  it('should remove https protocol', () => {
    expect(normalizeDomain('https://twitter.com')).toBe('twitter.com');
  });

  it('should reject invalid domains', () => {
    expect(normalizeDomain('not a domain')).toBeNull();
  });
});
```

### Component Tests

```typescript
// Testing Button component
describe('Button', () => {
  it('should render with correct variant', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('should handle click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show loading spinner', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});
```

### Integration Tests

```typescript
// Testing storage integration
describe('Storage Service', () => {
  it('should save and load settings', async () => {
    const settings = { ...DEFAULT_SETTINGS, tabBudget: 15 };
    await saveSettings(settings);
    const loaded = await loadSettings();
    expect(loaded.tabBudget).toBe(15);
  });

  it('should handle storage errors gracefully', async () => {
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('Storage full'));
    const result = await saveSettings(DEFAULT_SETTINGS);
    expect(result).toBe(false);
  });
});
```

### Accessibility Tests

```typescript
// Testing accessibility
describe('Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('should be keyboard navigable', () => {
    render(<Sites />);
    const firstButton = screen.getByRole('button', { name: /add/i });
    firstButton.focus();
    expect(document.activeElement).toBe(firstButton);
  });
});
```

### Manual QA Checklist

```markdown
## Manual QA Checklist

### Installation
- [ ] Extension loads without errors
- [ ] Popup opens correctly
- [ ] Badge shows correct tab count

### Constraint Management
- [ ] Add constraint works
- [ ] Edit constraint works
- [ ] Remove constraint works
- [ ] Validation errors show correctly

### Enforcement
- [ ] Checkpoint page shows correctly
- [ ] Delay page shows with countdown
- [ ] PIN page accepts input
- [ ] Hard block page shows
- [ ] Tab budget page shows

### Settings
- [ ] PIN setup works
- [ ] Tab budget setting works
- [ ] Landing page setting works
- [ ] Import/export works

### Edge Cases
- [ ] Storage full scenario
- [ ] Multiple windows
- [ ] Tab restore
- [ ] Extension reload
```

### Recommended Tools

| Layer | Tool |
|---|---|
| Unit Tests | Vitest |
| Component Tests | React Testing Library |
| Accessibility Tests | axe-core + jest-axe |
| E2E Tests | Playwright (with Chrome extension testing) |
| Coverage | v8 |

---

## 15. Folder Structure

```
boomrng/
├── src/
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx                      # Entry point
│   │   ├── App.tsx                        # Root component
│   │   ├── screens/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Sites.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── foundation/
│   │   │   │   ├── Button/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Button.module.css
│   │   │   │   │   └── Button.test.tsx
│   │   │   │   ├── Input/
│   │   │   │   ├── Select/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Toast/
│   │   │   │   ├── Card/
│   │   │   │   ├── Badge/
│   │   │   │   ├── ProgressBar/
│   │   │   │   ├── Spinner/
│   │   │   │   └── Divider/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell/
│   │   │   │   ├── PageContainer/
│   │   │   │   ├── Header/
│   │   │   │   ├── BottomNavigation/
│   │   │   │   ├── Section/
│   │   │   │   ├── Stack/
│   │   │   │   └── Grid/
│   │   │   ├── dashboard/
│   │   │   │   ├── ConstraintSummary.tsx
│   │   │   │   ├── ConstraintList.tsx
│   │   │   │   ├── ConstraintRow.tsx
│   │   │   │   ├── TabBudget.tsx
│   │   │   │   ├── StrictModeCard.tsx
│   │   │   │   └── StatusBadge.tsx
│   │   │   ├── constraints/
│   │   │   │   ├── ConstraintCard.tsx
│   │   │   │   ├── ConstraintEditor.tsx
│   │   │   │   ├── ConstraintBehaviorPicker.tsx
│   │   │   │   ├── BehaviorBadge.tsx
│   │   │   │   ├── ConstraintFilters.tsx
│   │   │   │   ├── AddConstraintModal.tsx
│   │   │   │   └── EditConstraintModal.tsx
│   │   │   ├── settings/
│   │   │   │   ├── SettingsGroup.tsx
│   │   │   │   ├── SettingsRow.tsx
│   │   │   │   ├── Toggle.tsx
│   │   │   │   ├── NumberInput.tsx
│   │   │   │   ├── PinSetup.tsx
│   │   │   │   └── ImportExport.tsx
│   │   │   └── feedback/
│   │   │       ├── EmptyState.tsx
│   │   │       ├── LoadingState.tsx
│   │   │       ├── ErrorState.tsx
│   │   │       └── ConfirmationDialog.tsx
│   │   ├── hooks/
│   │   │   ├── useStorageState.ts
│   │   │   ├── useConstraints.ts
│   │   │   ├── useSettings.ts
│   │   │   ├── useTabCount.ts
│   │   │   └── useKeyboard.ts
│   │   └── styles/
│   │       ├── tokens.css
│   │       ├── reset.css
│   │       ├── base.css
│   │       ├── components.css
│   │       ├── layout.css
│   │       └── screens.css
│   │
│   ├── enforcement/
│   │   ├── checkpoint/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   ├── CheckpointPage.tsx
│   │   │   └── CheckpointPage.module.css
│   │   ├── delay/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   ├── DelayPage.tsx
│   │   │   └── DelayPage.module.css
│   │   ├── pin/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   ├── PinPage.tsx
│   │   │   └── PinPage.module.css
│   │   ├── hardblock/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   ├── HardBlockPage.tsx
│   │   │   └── HardBlockPage.module.css
│   │   └── tabbudget/
│   │       ├── index.html
│   │       ├── main.tsx
│   │       ├── TabBudgetPage.tsx
│   │       └── TabBudgetPage.module.css
│   │
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── enforcement.ts
│   │   ├── tab-manager.ts
│   │   ├── badge.ts
│   │   ├── scheduler.ts
│   │   └── messaging.ts
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   ├── constraint.ts
│   │   │   ├── settings.ts
│   │   │   ├── enforcement.ts
│   │   │   └── messages.ts
│   │   ├── storage/
│   │   │   ├── storage-service.ts
│   │   │   ├── migration.ts
│   │   │   └── import-export.ts
│   │   ├── engines/
│   │   │   ├── constraint-engine.ts
│   │   │   ├── behavior-engine.ts
│   │   │   └── tab-budget-engine.ts
│   │   ├── services/
│   │   │   ├── message-service.ts
│   │   │   ├── rules-builder.ts
│   │   │   └── validation-service.ts
│   │   └── utils/
│   │       ├── domain.ts
│   │       ├── time.ts
│   │       └── format.ts
│   │
│   └── assets/
│       ├── icons/
│       │   ├── icon-16.png
│       │   ├── icon-48.png
│       │   └── icon-128.png
│       └── images/
│           └── boomrng-icon.svg
│
├── public/
│   ├── manifest.json
│   └── _locales/
│       └── en/
│           └── messages.json
│
├── tests/
│   ├── unit/
│   │   ├── engines/
│   │   ├── storage/
│   │   └── utils/
│   ├── component/
│   │   ├── foundation/
│   │   ├── layout/
│   │   └── screens/
│   ├── integration/
│   │   ├── storage.test.ts
│   │   └── enforcement.test.ts
│   └── accessibility/
│       └── a11y.test.ts
│
├── scripts/
│   ├── build.ts
│   └── zip.ts
│
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 16. Dependency Graph

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                          POPUP                                   │
│  App.tsx → screens/* → components/* → hooks/* → shared/*       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKGROUND                                │
│  service-worker.ts → enforcement.ts                             │
│                   → tab-manager.ts                              │
│                   → badge.ts                                    │
│                   → scheduler.ts                                │
│                   → messaging.ts                                │
│                   → shared/*                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ENFORCEMENT PAGES                           │
│  main.tsx → *Page.tsx → shared/*                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SHARED                                   │
│  types/*        (no dependencies)                               │
│  utils/*        (no dependencies)                               │
│  storage/*      → types/*                                       │
│  engines/*      → types/*, utils/*                              │
│  services/*     → types/*, storage/*, engines/*                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Rules

1. **No circular dependencies.** Shared modules never import from popup/background/enforcement.
2. **Unidirectional data flow.** Components → Hooks → Services → Storage.
3. **Clear boundaries.** Each layer only imports from the layer below.
4. **Shared is the foundation.** Everything depends on shared, shared depends on nothing.

---

## 17. Implementation Order

### Milestone 1: Foundation (Week 1)

**Goal:** Set up project, build foundation components, establish patterns.

**Files:**
- `vite.config.ts`
- `tsconfig.json`
- `package.json`
- `src/shared/types/*`
- `src/shared/utils/*`
- `src/popup/components/foundation/*`

**Dependencies:** None

**Acceptance Criteria:**
- Project builds and runs
- All foundation components render
- TypeScript compiles without errors
- Vitest runs and passes

**Estimated Effort:** 3-4 days

**Risks:**
- Chrome Extension Vite configuration complexity
- TypeScript strict mode issues

**Definition of Done:**
- [ ] Project scaffolding complete
- [ ] Foundation components implemented
- [ ] Unit tests pass
- [ ] Storybook or documentation working

---

### Milestone 2: Storage Layer (Week 2)

**Goal:** Implement storage service, migration, import/export.

**Files:**
- `src/shared/storage/*`
- `src/shared/services/validation-service.ts`

**Dependencies:** Milestone 1

**Acceptance Criteria:**
- Settings save/load works
- Constraints save/load works
- Migration system works
- Import/export works

**Estimated Effort:** 2-3 days

**Risks:**
- Chrome Storage API quirks
- Migration edge cases

**Definition of Done:**
- [ ] Storage service complete
- [ ] Migration system tested
- [ ] Import/export tested
- [ ] Unit tests pass

---

### Milestone 3: Popup Shell (Week 2-3)

**Goal:** Build popup with routing, navigation, and layout components.

**Files:**
- `src/popup/main.tsx`
- `src/popup/App.tsx`
- `src/popup/components/layout/*`
- `src/popup/screens/Dashboard.tsx` (skeleton)
- `src/popup/screens/Sites.tsx` (skeleton)
- `src/popup/screens/Settings.tsx` (skeleton)

**Dependencies:** Milestone 1

**Acceptance Criteria:**
- Popup opens with 3 tabs
- Navigation works
- Layout components render
- Screens are placeholders

**Estimated Effort:** 2-3 days

**Risks:**
- Chrome Extension popup sizing
- CSS module configuration

**Definition of Done:**
- [ ] Popup shell complete
- [ ] Navigation works
- [ ] Layout components render

---

### Milestone 4: Constraint Engine (Week 3)

**Goal:** Implement constraint evaluation logic.

**Files:**
- `src/shared/engines/constraint-engine.ts`
- `src/shared/engines/behavior-engine.ts`
- `src/shared/services/rules-builder.ts`

**Dependencies:** Milestone 1, Milestone 2

**Acceptance Criteria:**
- Constraint evaluation works for all 8 behaviors
- Rules builder generates correct declarativeNetRequest rules
- Strict Mode overrides behaviors

**Estimated Effort:** 3-4 days

**Risks:**
- declarativeNetRequest API complexity
- Progressive delay state management

**Definition of Done:**
- [ ] Constraint engine complete
- [ ] Behavior engine complete
- [ ] Rules builder complete
- [ ] Unit tests pass

---

### Milestone 5: Background Service Worker (Week 3-4)

**Goal:** Implement background script with enforcement, tab management, badge.

**Files:**
- `src/background/service-worker.ts`
- `src/background/enforcement.ts`
- `src/background/tab-manager.ts`
- `src/background/badge.ts`
- `src/background/scheduler.ts`
- `src/background/messaging.ts`

**Dependencies:** Milestone 2, Milestone 4

**Acceptance Criteria:**
- Enforcement rules refresh on storage change
- Badge updates on tab count change
- Tab budget enforced
- Messages handled correctly

**Estimated Effort:** 4-5 days

**Risks:**
- Service worker lifecycle
- declarativeNetRequest rule limits
- Tab event handling edge cases

**Definition of Done:**
- [ ] Background service worker complete
- [ ] Enforcement works
- [ ] Badge updates correctly
- [ ] Tab budget enforced

---

### Milestone 6: Dashboard Screen (Week 4)

**Goal:** Build complete Dashboard screen with all components.

**Files:**
- `src/popup/screens/Dashboard.tsx`
- `src/popup/components/dashboard/*`
- `src/popup/hooks/*`

**Dependencies:** Milestone 2, Milestone 3

**Acceptance Criteria:**
- Constraint summary shows
- Constraint list renders
- Tab budget progress bar works
- Strict Mode toggle works

**Estimated Effort:** 3-4 days

**Risks:**
- Real-time updates
- Derived state computation

**Definition of Done:**
- [ ] Dashboard screen complete
- [ ] All components render
- [ ] Real-time updates work

---

### Milestone 7: Sites Screen (Week 5)

**Goal:** Build complete Sites screen with constraint management.

**Files:**
- `src/popup/screens/Sites.tsx`
- `src/popup/components/constraints/*`
- `src/popup/components/settings/*` (NumberInput, Toggle)

**Dependencies:** Milestone 2, Milestone 3, Milestone 6

**Acceptance Criteria:**
- Constraint list renders
- Add constraint modal works
- Edit constraint modal works
- Remove constraint works
- Filters work

**Estimated Effort:** 4-5 days

**Risks:**
- Modal state management
- Form validation

**Definition of Done:**
- [ ] Sites screen complete
- [ ] CRUD operations work
- [ ] Filters work

---

### Milestone 8: Settings Screen (Week 5-6)

**Goal:** Build complete Settings screen.

**Files:**
- `src/popup/screens/Settings.tsx`
- `src/popup/components/settings/*`

**Dependencies:** Milestone 2, Milestone 3

**Acceptance Criteria:**
- PIN setup works
- Tab budget setting works
- Landing page setting works
- Import/export works

**Estimated Effort:** 2-3 days

**Risks:**
- PIN validation
- Import/export edge cases

**Definition of Done:**
- [ ] Settings screen complete
- [ ] All settings save correctly
- [ ] Import/export works

---

### Milestone 9: Enforcement Pages (Week 6)

**Goal:** Build all enforcement pages.

**Files:**
- `src/enforcement/checkpoint/*`
- `src/enforcement/delay/*`
- `src/enforcement/pin/*`
- `src/enforcement/hardblock/*`
- `src/enforcement/tabbudget/*`

**Dependencies:** Milestone 4, Milestone 5

**Acceptance Criteria:**
- Checkpoint page shows correctly
- Delay page shows with countdown
- PIN page accepts input
- Hard block page shows
- Tab budget page shows

**Estimated Effort:** 4-5 days

**Risks:**
- Multiple page builds
- Cross-page communication

**Definition of Done:**
- [ ] All enforcement pages complete
- [ ] Each page works correctly
- [ ] Communication with background works

---

### Milestone 10: Polish & Testing (Week 7)

**Goal:** Final polish, accessibility, testing.

**Files:**
- All files (refactoring)
- `tests/*`

**Dependencies:** All previous milestones

**Acceptance Criteria:**
- All unit tests pass
- Accessibility audit passes
- Performance audit passes
- Manual QA passes

**Estimated Effort:** 3-4 days

**Risks:**
- Accessibility issues
- Performance issues

**Definition of Done:**
- [ ] All tests pass
- [ ] Accessibility verified
- [ ] Performance verified
- [ ] Ready for release

---

## 18. Engineering Principles

### 1. Composition Over Inheritance

Components compose. Classes don't inherit. Build complex UIs by combining simple, focused components.

### 2. Accessibility by Default

Every component includes ARIA attributes, keyboard navigation, and focus management. Accessibility is not an afterthought.

### 3. No Business Logic Inside UI Components

Components render UI. Hooks manage state. Services handle business logic. Engines make decisions. Keep each layer focused.

### 4. One Responsibility Per Module

Each file, each function, each component does one thing. If a module is doing two things, split it.

### 5. Keep Chrome APIs Isolated

Chrome APIs are called in services, never in components. This makes testing easier and keeps UI framework-agnostic.

### 6. Prefer Explicit Over Implicit

Explicit types, explicit imports, explicit returns. No magic, no surprises, no hidden behavior.

### 7. Optimize for Readability

Code is read more than it is written. Write code that the next developer (or future you) can understand in 30 seconds.

### 8. Minimize Side Effects

Functions should not modify external state unless that is their explicit purpose. Pure functions where possible.

### 9. Fail Open for Enforcement

If enforcement fails, allow access. Privacy is more important than perfect blocking.

### 10. Fail Closed for Storage

If storage fails, retry and alert the user. Data integrity is critical.

### 11. No Network Requests

Boomrng works entirely offline. No analytics, no telemetry, no tracking. Everything stays local.

### 12. Schema Versioning

All storage structures include a version number. Migrations are explicit and versioned.

### 13. Type Safety

TypeScript strict mode. No `any` types. No type assertions unless absolutely necessary.

### 14. Test Everything

Unit tests for logic. Component tests for UI. Integration tests for storage. Accessibility tests for a11y.

### 15. Keep It Simple

The best code is no code. The second best is simple code. Avoid clever solutions. Prefer straightforward implementations.

---

## Summary

This engineering architecture provides:

- **Complete system design** with diagrams and communication flows
- **Runtime architecture** for every execution context
- **TypeScript interfaces** for all domain models
- **Storage architecture** with migration, import/export, and caching
- **Messaging architecture** with typed messages and error handling
- **Constraint engine** with evaluation order and caching
- **Behavior engine** for all 8 constraint behaviors
- **Tab budget engine** with counting, exclusion, and edge cases
- **State management** with clear categories and update flows
- **Error handling** with recovery strategies
- **Performance strategy** with lazy loading, memoization, and batching
- **Security guidelines** for PIN storage, data privacy, and input sanitization
- **Testing strategy** with layers, tools, and checklists
- **Folder structure** organized by concern
- **Dependency graph** with clear boundaries
- **Implementation order** with 10 milestones
- **Engineering principles** that guide every contribution

The architecture is designed for a solo developer building a production-quality Chrome extension. Every decision is documented. Every interface is defined. Every trade-off is justified.

Implementation can begin immediately following this blueprint.