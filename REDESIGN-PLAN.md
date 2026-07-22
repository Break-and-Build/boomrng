# Boomrng v2 — Product Strategy Document

> Boomrng is not a productivity app. It is a behavioral constraint system.
>
> Productivity apps help people work. Boomrng helps people make intentional decisions before they become distracted. Every recommendation in this document reinforces that distinction.

---

## What Boomrng Is

A Chrome extension that enforces intentional browsing through:

- **Constraint** — blocking distracting sites by default
- **Friction** — creating pauses before autopilot decisions
- **Awareness** — surfacing patterns users can't see themselves
- **Privacy** — everything stays local, no accounts, no tracking

## What Boomrng Is Not

- A screen time tracker
- A focus timer with analytics
- A productivity dashboard
- A website blocker with charts

---

## Revised Product Vision

### Positioning

> "Boomrng stops you before you stop yourself."

Boomrng is the opinionated browser extension for knowledge workers who know their attention is finite. It doesn't track time. It doesn't generate reports. It creates the right friction at the right moment to help you browse with intention.

### Core Philosophy

**Intentional Browsing**

Every website visit should be a choice, not a reflex. Boomrng creates friction at the moment of decision — the moment between "I want to check Twitter" and actually doing it. That's where habits live. That's where change happens.

### Brand Voice

- **Confident** — We know what we're for
- **Calm** — No panic, no urgency, no guilt
- **Direct** — No fluff, no apologies
- **Opinionated** — We make recommendations, not just options
- **Private** — Your data never leaves your browser

### Design Language

Boomrng should feel like:

- Linear — Clean, fast, intentional
- Raycast — Keyboard-first, minimal chrome
- Arc — Opinionated, modern, premium

Boomrng should NOT feel like:

- RescueTime — No analytics dashboard
- ClickUp — No feature sprawl
- Notion — No endless customization

---

## Updated UX Principles

1. **Friction over features** — A well-placed pause is worth more than a new setting
2. **Calm over urgency** — Never guilt, never panic, never fake encouragement
3. **Privacy by default** — No accounts, no sync, no tracking, no exceptions
4. **Opinionated defaults** — The product should work well without configuration
5. **Instant feedback** — Every action has an immediate, visible result
6. **Minimal chrome** — The UI should disappear when you're browsing intentionally

## Updated Design Principles

1. **Breathing room** — Whitespace is a feature, not wasted space
2. **Purposeful color** — Green means active, red means enforced, nothing is decorative
3. **Subtle motion** — Animation guides attention, never celebrates
4. **Typographic calm** — Clear hierarchy, no shouting, no all-caps labels
5. **Material honesty** — Shadows create depth, borders create separation, nothing is fake

---

## Simplified Information Architecture

### Current Structure (Broken)

```
Popup
├── Splash Screen (useless)
├── PIN Setup Screen (disconnected)
├── PIN Entry Screen (disconnected)
└── Settings Screen (everything crammed in)
```

### Proposed Structure

```
Popup
├── Dashboard (status + active constraints)
├── Sites (manage constraints)
├── Focus (intentional sessions)
└── Settings (configuration)
```

**Why four screens:**

- **Dashboard** — Instant status. What's active, what's enforced, what needs attention.
- **Sites** — Where you define your constraints. Blocked, delayed, always allowed.
- **Focus** — Where you start intentional work sessions.
- **Settings** — Everything else. PIN, import/export, about.

**What's removed:**

- Tabs screen — Tab budget is shown on Dashboard, configured in Settings
- Security screen — PIN is in Settings, override is in Sites
- Stats screen — No analytics. Boomrng is about behavior, not data.
- Help screen — Settings includes a minimal about section

---

## Product Language

Replace technical language with language that reinforces the behavioral constraint philosophy.

| Current Term     | New Term             | Why                                                                  |
| ---------------- | -------------------- | -------------------------------------------------------------------- |
| Blocked Sites    | Constraints          | "Blocked" implies failure. "Constraints" implies intentional design. |
| Timer            | Delay                | "Timer" is mechanical. "Delay" implies a pause before action.        |
| Timer Override   | Intentional Override | Requires a conscious decision to bypass.                             |
| Allowed Sites    | Always Allowed       | Clearer. These sites are never constrained.                          |
| Disable          | Remove Constraints   | You're not disabling the product. You're removing your constraints.  |
| Redirect URL     | Landing Page         | Where you land when a constraint activates.                          |
| Max Tabs         | Tab Budget           | "Budget" implies intentional allocation.                             |
| The Wall         | Tab Limit Page       | Functional. No drama.                                                |
| Save Settings    | Apply Constraints    | You're not saving settings. You're activating your constraints.      |
| Enabled/Disabled | Active/Inactive      | Status, not mode.                                                    |
| PIN Lock         | PIN Protection       | Protects your constraints from yourself.                             |
| Focus Session    | Intentional Session  | You're choosing to focus, not being forced.                          |

### Throughout the product

| Context             | Current Copy       | Better Copy                                 |
| ------------------- | ------------------ | ------------------------------------------- |
| Empty blocked sites | (blank)            | "No constraints yet. Add your first."       |
| Save confirmation   | "SAVED & LOCKED"   | "Constraints applied."                      |
| Tab limit reached   | "LIMIT REACHED"    | "Tab budget exceeded."                      |
| Timer active        | "Blocked for 45m"  | "Delayed for 45m"                           |
| Override success    | "Timer overridden" | "Intentional override active"               |
| Dashboard header    | (none)             | "Today's constraints are active."           |
| Badge (tabs OK)     | Tab count          | Tab count with green background             |
| Badge (over limit)  | Tab count          | Tab count with red background               |
| First visit         | Splash screen      | "Welcome. Let's set your first constraint." |

---

## Making Boomrng Feel Alive

Without becoming noisy. Without fake encouragement. Without motivational quotes.

### Subtle Product Copy

These appear contextually in the popup. They're calm observations, not celebrations.

**Dashboard**

- "Today's constraints are active."
- "3 constraints enforced today."
- "Tab budget: 7 of 10 used."
- "1 active delay on twitter.com."

**When a constraint activates**

- "youtube.com is delayed for 30 minutes."
- "You've opened twitter.com 4 times today."
- "This constraint has been enforced 12 times this week."

**When approaching tab limit**

- "Tab budget is almost full."
- "8 of 10 tabs used."

**When tab limit is exceeded**

- "Tab budget exceeded. Close a tab to continue."
- "You have 3 tabs over your budget."

**When a delay expires**

- "twitter.com is now available."
- "Your delay on reddit.com has ended."

**When intentional override is used**

- "Intentional override active for youtube.com."
- "This override expires in 45 minutes."

**End of day (if viewed)**

- "6 constraints enforced today."
- "You stayed within your tab budget."

### What Boomrng Does NOT Say

- "Great job!"
- "You're doing amazing!"
- "Keep it up!"
- "🔥 streak!"
- "You saved 2 hours today!"
- "You're in the top 10% of focused users!"

Boomrng is not your coach. It's your constraint system. It states facts. It doesn't judge.

---

## Behavioral Friction System

This is Boomrng's core differentiator. Not features. Not analytics. **Friction.**

The goal: interrupt autopilot at the moment of decision without becoming annoying.

### The Friction Spectrum

Boomrng should offer escalating levels of friction, from gentle to firm:

```
Level 1: Awareness    → "You're about to open Twitter."
Level 2: Pause        → 3-second countdown before redirect.
Level 3: Question     → "Why are you opening this?"
Level 4: Delay        → Site is unavailable for N minutes.
Level 5: Block        → Site is inaccessible.
```

Users configure which level applies to each constraint. Default is Level 5 (block).

### 25 Behavioral Friction Ideas

#### Interrupting Autopilot

1. **Pre-redirect pause** — Before redirecting to the landing page, show a 3-second countdown. "You're being redirected. Closing in 3..." This creates a moment to change your mind.

2. **Intentional browsing prompt** — Before blocking, ask: "Why are you opening this?" with options: Work, Learn, Entertainment, Habit. If they choose "Habit," the block stands. If they choose "Work," offer to add to Always Allowed.

3. **Tab count awareness** — When opening a new tab near the budget, show: "Tab budget is almost full. Do you need this tab?" Yes/No.

4. **Site visit counter** — On the dashboard, show "You've opened twitter.com 12 times today." Not to guilt. To create awareness.

5. **Delayed gratification** — When trying to access a blocked site, show: "This site is delayed for 30 minutes. You can access it at 3:45 PM." Then redirect.

#### Creating Intentional Pauses

6. **Breathing moment** — When a constraint activates, show a calm screen for 5 seconds with the site name and a simple message. No animation. No guilt. Just a pause.

7. **Decision confirmation** — For intentional overrides: "You're about to override a constraint on youtube.com. This requires your PIN. Continue?" Forces a conscious decision.

8. **Tab closing prompt** — When over budget: "You have 3 tabs over your budget. Close the oldest?" One-click resolution.

9. **Session start ritual** — When starting an intentional session: "What are you working on?" One-line input. Creates mental framing.

10. **Delay progress** — Show a subtle progress bar when a delay is active. "45 minutes remaining on twitter.com."

#### Surfacing Patterns

11. **Daily constraint count** — "6 constraints enforced today." Just a number. No analysis.

12. **Most constrained site** — "twitter.com has been delayed 8 times this week." Awareness, not judgment.

13. **Tab budget adherence** — "You stayed within your tab budget today." Calm statement of fact.

14. **Pattern observation** — "You tend to open twitter.com most between 2-4 PM." Delivered once, not repeatedly.

15. **Weekly summary** — One sentence on the dashboard: "This week: 47 constraints enforced, 3 intentional overrides."

#### Escalating Friction

16. **Warning before block** — First visit to a constrained site: "This site is delayed for 30 minutes." Second visit: "This site is blocked." Third visit: "This site is blocked. Override requires PIN."

17. **Progressive delays** — First delay: 5 minutes. Second delay same day: 15 minutes. Third delay: 30 minutes. The more you try, the longer you wait.

18. **Cooling period** — After 3 failed attempts to access a site: "This site is now blocked for 2 hours." Automatic escalation.

19. **Tab budget enforcement** — First violation: Warning. Second violation: Must close a tab. Third violation: Must close 2 tabs.

20. **PIN requirement escalation** — After 2 intentional overrides in a day: "Override now requires PIN confirmation."

#### Encouraging Intentional Behavior

21. **Why did you open this?** — After accessing a delayed site: "You waited 30 minutes for reddit.com. Was it worth it?" Yes/No. Creates reflection without judgment.

22. **Alternative suggestion** — When blocking a site: "YouTube is blocked. Would you like to open a focus playlist instead?" Suggests productive alternatives.

23. **Session completion** — When ending an intentional session: "Session complete. You focused for 47 minutes." Just a fact.

24. **Constraint review** — Weekly: "You have 5 active constraints. Review?" One-click to see and adjust.

25. **Intentional override tracking** — "You've used 2 intentional overrides today. Your limit is 3." Creates awareness of override frequency.

#### Environmental Friction

26. **Landing page design** — The redirect landing page should be calm, minimal, and useful. Not a blank page. Not a guilt trip. A page that says: "You're here because you chose to be intentional. Here's what you can do instead."

27. **Badge color psychology** — Green = within budget. Orange = approaching limit. Red = over budget. No text. Just color.

28. **Popup opening friction** — When opening the popup near a constrained site: "You're near a constrained site. Stay focused?" Subtle, not blocking.

29. **Tab title changes** — Over-budget tabs show "[OVER BUDGET]" in their title. Creates ambient awareness.

30. **New tab page override** — When over budget, the new tab page shows: "Close a tab before opening a new one." With a list of current tabs.

---

## Dashboard Design

Replace dashboards full of charts. The popup should communicate only what matters immediately.

### Layout

```
┌─────────────────────────────────┐
│                                 │
│  boomrng                   [ON]│
│                                 │
│  Today's constraints are active.│
│                                 │
│  ┌─────────────────────────────┐│
│  │  CONSTRAINTS                ││
│  │  3 active · 6 enforced      ││
│  │  today                      ││
│  │                             ││
│  │  twitter.com     delayed    ││
│  │  youtube.com     blocked    ││
│  │  reddit.com      blocked    ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  TAB BUDGET                 ││
│  │  ████████████░░░ 7/10       ││
│  │                             ││
│  │  3 tabs available           ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  ACTIVE DELAYS              ││
│  │  twitter.com   45m remaining││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  TODAY                      ││
│  │  6 constraints enforced     ││
│  │  Tab budget maintained      ││
│  └─────────────────────────────┘│
│                                 │
│  [Dashboard] [Sites] [Focus]   │
│  [Settings]                     │
│                                 │
└─────────────────────────────────┘
```

### What's Shown

- **Constraints** — Active count, enforced today count, list of active constraints with status
- **Tab Budget** — Visual progress bar, tabs available
- **Active Delays** — Sites with countdown timers
- **Today** — Calm summary: constraints enforced, budget maintained

### What's NOT Shown

- Charts
- Graphs
- Time-series data
- Comparisons to yesterday/last week
- Scores
- Streaks
- Rankings

The dashboard is a status display, not an analytics report.

---

## Sites Screen Design

Where you manage your constraints.

### Layout

```
┌─────────────────────────────────┐
│                                 │
│  [← Dashboard]     [+ Add]     │
│                                 │
│  CONSTRAINTS                    │
│                                 │
│  ┌─────────────────────────────┐│
│  │  twitter.com          [×]  ││
│  │  Delayed · 45m remaining   ││
│  │                             ││
│  │  youtube.com          [×]  ││
│  │  Blocked                   ││
│  │                             ││
│  │  reddit.com           [×]  ││
│  │  Blocked                   ││
│  └─────────────────────────────┘│
│                                 │
│  ALWAYS ALLOWED                 │
│                                 │
│  ┌─────────────────────────────┐│
│  │  localhost            [×]  ││
│  │  github.com           [×]  ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  LANDING PAGE               ││
│  │  https://github.com         ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  TAB BUDGET                 ││
│  │  [10] tabs                  ││
│  └─────────────────────────────┘│
│                                 │
│  [Dashboard] [Sites] [Focus]   │
│  [Settings]                     │
│                                 │
└─────────────────────────────────┘
```

### Add Constraint Flow

When tapping "+ Add":

```
┌─────────────────────────────────┐
│                                 │
│  ADD CONSTRAINT                 │
│                                 │
│  Site                            │
│  ┌─────────────────────────────┐│
│  │  twitter.com                ││
│  └─────────────────────────────┘│
│                                 │
│  Enforcement                    │
│  (○) Block immediately          │
│  ( ) Delay: [30] minutes        │
│  ( ) Delay: [  ] custom         │
│                                 │
│  Category (optional)            │
│  [Social ▾]                     │
│                                 │
│  ┌─────────────────────────────┐│
│  │  ADD CONSTRAINT             ││
│  └─────────────────────────────┘│
│                                 │
│  └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

### What's Good

- Clear list of constraints with status
- Quick add flow
- Visual feedback on active delays

### What's Improved

- Status indicators (delayed, blocked, always allowed)
- Delay countdowns visible at a glance
- Category tags for organization
- Simpler add flow with enforcement options

---

## Focus Screen Design

Where you start intentional work sessions.

### Layout

```
┌─────────────────────────────────┐
│                                 │
│  [← Dashboard]                  │
│                                 │
│  INTENTIONAL SESSION            │
│                                 │
│  What are you working on?       │
│  ┌─────────────────────────────┐│
│  │  Writing the API docs       ││
│  └─────────────────────────────┘│
│                                 │
│  Duration                       │
│  [25m] [50m] [90m] [Custom]    │
│                                 │
│  Constraints during session     │
│  (●) All active constraints     │
│  ( ) Strict mode (no overrides) │
│                                 │
│  ┌─────────────────────────────┐│
│  │  START SESSION              ││
│  └─────────────────────────────┘│
│                                 │
│  ───────────────────────────────│
│                                 │
│  ACTIVE SESSION                 │
│                                 │
│  Writing the API docs           │
│  23:45 remaining                │
│                                 │
│  Constraints: 3 active          │
│  Tab budget: enforced           │
│                                 │
│  ┌─────────────────────────────┐│
│  │  END SESSION                ││
│  └─────────────────────────────┘│
│                                 │
│  [Dashboard] [Sites] [Focus]   │
│  [Settings]                     │
│                                 │
└─────────────────────────────────┘
```

### What Makes This Different

- **Intentional, not forced** — You choose to start a session
- **Friction-aware** — Constraints stay active during sessions
- **Simple** — Just a timer and a task description
- **No analytics** — We don't track how many sessions you've completed
- **Private** — Session data stays local, deleted when session ends

---

## Settings Screen

Minimal. Only what's necessary.

### Layout

```
┌─────────────────────────────────┐
│                                 │
│  [← Dashboard]                  │
│                                 │
│  SETTINGS                       │
│                                 │
│  PIN PROTECTION                 │
│  ┌─────────────────────────────┐│
│  │  Set PIN          [Set →]  ││
│  │  Protects constraints      ││
│  │  and intentional overrides ││
│  └─────────────────────────────┘│
│                                 │
│  INTENTIONAL OVERRIDES          │
│  ┌─────────────────────────────┐│
│  │  Max per day: [3]          ││
│  │  Require PIN after: [2]    ││
│  └─────────────────────────────┘│
│                                 │
│  IMPORT / EXPORT                │
│  ┌─────────────────────────────┐│
│  │  Export constraints [→]    ││
│  │  Import constraints [←]    ││
│  └─────────────────────────────┘│
│                                 │
│  ABOUT                          │
│  ┌─────────────────────────────┐│
│  │  boomrng v2.0              ││
│  │  Behavioral constraint     ││
│  │  system                    ││
│  │                            ││
│  │  Privacy: Everything stays ││
│  │  in your browser. No       ││
│  │  accounts, no tracking,    ││
│  │  no sync.                  ││
│  └─────────────────────────────┘│
│                                 │
│  [Dashboard] [Sites] [Focus]   │
│  [Settings]                     │
│                                 │
└─────────────────────────────────┘
```

---

## The Wall (Tab Limit Page) Redesign

The current Wall is dramatic but unhelpful. The new version should be calm, actionable, and informative.

### Current

```
LIMIT REACHED

You have too many tabs open.
Close some tabs to unlock your focus.

BOOMRNG PROTOCOL ACTIVE
```

### Proposed

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│       Tab budget exceeded       │
│                                 │
│    You have 13 tabs open.       │
│    Your budget is 10.           │
│                                 │
│    Close 3 tabs to continue.    │
│                                 │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │  Tab 1: github.com    [×]  ││
│  │  Tab 2: docs.python  [×]  ││
│  │  Tab 3: stackoverflow [×] ││
│  │  ...                       ││
│  │                             ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │  CLOSE 3 OLDEST TABS       ││
│  └─────────────────────────────┘│
│                                 │
│                                 │
└─────────────────────────────────┘
```

### What's Improved

- Calm language ("exceeded" not "REACHED")
- Specific numbers (13 open, budget is 10)
- Actionable: list of tabs with close buttons
- One-click: close oldest tabs automatically
- No dramatic styling, no protocol language

---

## Features to Prioritize

Every feature must reinforce intentional browsing. If it doesn't change behavior, remove it.

### Core (Must Have)

1. **Constraint management** — Add, edit, remove constrained sites
2. **Delay system** — Per-site delays with countdown timers
3. **Tab budget** — Visual progress bar, enforcement
4. **Intentional override** — PIN-protected bypass with limits
5. **Landing page** — Calm redirect page with alternatives
6. **Quick pause** — Pause all constraints for 5/15/30 minutes

### Behavioral (Differentiators)

7. **Pre-redirect pause** — 3-second countdown before redirect
8. **Intentional browsing prompt** — "Why are you opening this?"
9. **Tab count awareness** — Warning before exceeding budget
10. **Progressive delays** — Escalating delays for repeated attempts
11. **Constraint count** — "6 constraints enforced today"
12. **Intentional session** — Timer-based focus with task description
13. **Session reflection** — "You focused for 47 minutes"

### Infrastructure (Required)

14. **Onboarding** — First-time setup flow
15. **Import/export** — Backup and restore constraints
16. **Keyboard shortcuts** — Quick toggle, quick pause
17. **Badge updates** — Real-time tab count, status colors
18. **Error handling** — Clear validation messages

### Removed From Previous Plan

- ~~Focus Score~~ — Gamification, not behavioral constraint
- ~~Weekly Reports~~ — Analytics, not behavior change
- ~~AI Insights~~ — Feature creep, privacy concerns
- ~~Streaks~~ — Gamification, not behavioral constraint
- ~~Heavy Analytics~~ — RescueTime territory
- ~~Multi-profile~~ — Complexity over simplicity
- ~~Dark/Light mode~~ — Nice-to-have, not essential
- ~~Cross-browser~~ — Focus on Chrome depth
- ~~Enterprise tier~~ — Wrong audience
- ~~Calendar integration~~ — Feature creep

---

## Why Boomrng Wins

### vs. One Sec

One Sec uses breathing exercises. Boomrng uses actual enforcement. One Sec is gentle. Boomrng is decisive. One Sec is iOS/macOS. Boomrng owns the browser.

**Boomrng's edge:** Hard enforcement when you need it. Breathing exercises don't block YouTube. Boomrng does.

### vs. Freedom

Freedom is cross-platform but complex. Boomrng is Chrome-only but focused. Freedom requires a subscription. Boomrng is free.

**Boomrng's edge:** Simplicity and price. Freedom tries to do everything. Boomrng does one thing perfectly.

### vs. Cold Turkey

Cold Turkey is extremely strict but has a dated desktop UI. Boomrng is modern and lives in the browser where distractions happen.

**Boomrng's edge:** UX and context. Cold Turkey is a separate app. Boomrng is where you browse.

### vs. StayFocusd

StayFocusd has limited timer options and no tab limiting. Boomrng has per-site delays and tab budgets.

**Boomrng's edge:** Tab limiting is unique. Per-site delays are more granular.

### vs. LeechBlock

LeechBlock is extremely customizable but overwhelming. Boomrng is opinionated but simple.

**Boomrng's edge:** Opinionation as a feature. LeechBlock requires configuration. Boomrng works out of the box.

### vs. RescueTime

RescueTime tracks everything. Boomrng blocks what matters. RescueTime is cloud-based. Boomrng is local.

**Boomrng's edge:** Privacy and enforcement. RescueTime observes. Boomrng acts.

### vs. Opal

Opal is premium iOS-native. Boomrng is free and Chrome-native. Opal tracks screen time. Boomrng enforces constraints.

**Boomrng's edge:** Platform and price. Opal is mobile. Boomrng is desktop browser.

### Boomrng's Unique Position

Boomrng is the only extension that combines:

1. **Hard enforcement** (not just suggestions)
2. **Tab budget** (unique feature)
3. **Behavioral friction** (intentional browsing prompts)
4. **Privacy-first** (no accounts, no tracking)
5. **Free** (no subscription)

No other tool does all five. That's the moat.

---

## UI Improvements

Keep Boomrng's existing colors. Modernize the UI while preserving its identity.

### Typography

| Current                | Improved                                          |
| ---------------------- | ------------------------------------------------- |
| Courier New everywhere | System font stack for body                        |
| Monospace for all text | Monospace only for timers and tab counts          |
| All-caps labels        | Sentence case for labels                          |
| No hierarchy           | Clear scale: 24px headers, 14px body, 12px labels |

```
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--font-mono: 'SF Mono', 'Fira Code', monospace
```

### Spacing

Use an 8px grid consistently:

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--space-8: 32px
```

### Colors (Extended, Preserving Brand)

```css
:root {
  /* Brand — preserved */
  --bg-primary: #003934;
  --bg-secondary: #0d251d;
  --accent: #00b242;

  /* Semantic */
  --success: #00b242;
  --warning: #f5a623;
  --error: #d32f2f;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --text-tertiary: #808080;

  /* Border */
  --border-default: #234e3f;
  --border-focus: #00b242;
}
```

### Components

| Component        | Style                              |
| ---------------- | ---------------------------------- |
| Primary button   | Green (#00B242) with white text    |
| Secondary button | Transparent with border            |
| Ghost button     | Transparent with green text        |
| Danger button    | Red (#D32F2F) with white text      |
| Input (default)  | Dark bg, subtle border             |
| Input (focus)    | Green border, subtle glow          |
| Input (error)    | Red border                         |
| Card             | Dark bg, subtle border, 8px radius |
| Badge            | Small, colored pill                |

### Motion

Keep animations subtle and fast:

| Element           | Animation        | Duration |
| ----------------- | ---------------- | -------- |
| Screen transition | Fade             | 200ms    |
| Button hover      | Background shift | 150ms    |
| Button press      | Scale 0.98       | 100ms    |
| Toast             | Slide up         | 200ms    |
| Progress bar      | Width transition | 300ms    |

Always respect `prefers-reduced-motion`.

---

## Engineering Improvements

### Folder Structure

```
src/
├── background/
│   ├── service-worker.js
│   ├── enforcement.js
│   ├── tab-manager.js
│   ├── badge.js
│   └── scheduler.js
├── popup/
│   ├── index.html
│   ├── popup.js
│   ├── screens/
│   │   ├── dashboard.js
│   │   ├── sites.js
│   │   ├── focus.js
│   │   └── settings.js
│   ├── components/
│   │   ├── site-row.js
│   │   ├── progress-bar.js
│   │   ├── toast.js
│   │   └── modal.js
│   └── styles/
│       ├── variables.css
│       ├── base.css
│       ├── components.css
│       └── screens.css
├── limit/
│   ├── index.html
│   └── limit.js
└── shared/
    ├── storage.js
    ├── rules-builder.js
    └── constants.js
```

### Key Improvements

1. **Extract storage logic** — `StorageManager` class for all Chrome storage operations
2. **Split background.js** — Separate concerns: enforcement, tabs, badge, scheduler
3. **CSS variables** — Design tokens in `variables.css`
4. **Component pattern** — Each component is a self-contained module
5. **Error boundaries** — Graceful degradation if storage fails
6. **Debounced saves** — Batch storage writes to prevent race conditions

### Performance

- Cache DOM queries on screen load
- Use `requestAnimationFrame` for UI updates
- Lazy-load screens (only initialize when visited)
- Debounce storage writes (300ms)
- Use `documentFragment` for batch DOM operations

### Testing

- Unit tests for `rules-builder.js` (pure logic)
- Integration tests for storage operations
- Manual testing checklist in README

---

## Implementation Roadmap

### Quick Wins (1-2 days)

1. Update typography to system font stack
2. Add CSS variables for design tokens
3. Improve button states (hover, focus, disabled)
4. Add focus rings for keyboard navigation
5. Fix spacing to use 8px grid
6. Add `aria-labels` to all interactive elements
7. Add success feedback after save
8. Add empty state for blocked sites
9. Add `prefers-reduced-motion` support
10. Improve error messages with inline validation

### Short-term (1 week)

1. Implement 4-screen navigation (Dashboard, Sites, Focus, Settings)
2. Add Quick Pause feature
3. Add tab budget progress bar to Dashboard
4. Reorganize folder structure
5. Extract storage logic to separate module
6. Add loading states
7. Improve The Wall with actionable UI
8. Add keyboard shortcuts
9. Add undo toast for delete actions
10. Implement new product language throughout

### Medium-term (2-4 weeks)

1. Intentional browsing prompts
2. Pre-redirect pause (3-second countdown)
3. Progressive delay system
4. Intentional session with timer
5. Constraint count on Dashboard
6. Import/export functionality
7. Onboarding flow
8. Tab count awareness warnings
9. Landing page redesign
10. Site categories

### Major (1-3 months)

1. Graduated restrictions (warn → delay → block)
2. Session reflection
3. Weekly summary (one sentence, not a report)
4. Advanced keyboard shortcuts
5. Tab title awareness ("[OVER BUDGET]")
6. New tab page override
7. Pattern observation (once per week)
8. Constraint review flow

### Long-term Vision

1. Chrome side panel support
2. Cross-browser (Firefox)
3. Team/organization constraints
4. Calendar-aware scheduling
5. API for third-party integrations

---

## Summary

Boomrng's path forward is not more features. It's better friction.

The previous version of this document recommended analytics, scores, reports, and gamification. That was wrong. Those features make Boomrng feel like RescueTime or Opal. They distract from the core mission.

The core mission is simple: **help people make intentional decisions before they become distracted.**

Every feature, every screen, every piece of copy should reinforce that mission. If it doesn't, remove it.

Boomrng wins by being:

- **Opinionated** — We know what's best
- **Calm** — No guilt, no panic, no celebration
- **Private** — Everything stays local
- **Decisive** — We block, not suggest
- **Premium** — Quality in every detail

The goal is to make Boomrng the best behavioral constraint browser extension available. Not the most feature-rich. Not the most customizable. The best at helping people browse with intention.

---

## Product Refinements

### 1. Navigation — Revised to Three Screens

The Focus screen is removed. It made Boomrng feel like a productivity app. The features it contained are absorbed into the Dashboard and Settings.

**Final navigation:**

```
Popup
├── Dashboard (status + strict mode)
├── Sites (constraints + tab budget)
└── Settings (PIN + import/export + about)
```

**Why three screens:**

- **Dashboard** — What's happening right now. Active constraints, tab budget, one-tap Strict Mode.
- **Sites** — Where you define and adjust constraints. One screen for everything related to what's blocked and how.
- **Settings** — Configuration only. PIN, import/export, about. Rarely visited.

**What was removed and why:**

- **Focus Screen** — Timer-based sessions are a productivity pattern. Boomrng is not a productivity app. The "Strict Mode" toggle on Dashboard replaces this with something that reinforces constraints, not work sessions.
- **Tab Budget as separate screen** — Tab budget is configuration, not a destination. It belongs in Sites (alongside constraints) or Settings. The Dashboard shows the current state. Sites lets you adjust the number.

**Revised navigation bar:**

```
[Dashboard] [Sites] [Settings]
```

Three labels. No icons needed. The popup should feel like a tool, not an app.

---

### 2. Signature Interaction — The Checkpoint

Every memorable product has one interaction people immediately associate with it.

- Arc → Spaces
- Raycast → Command Bar
- Superhuman → Keyboard-first workflow
- Linear → Issue creation

**Boomrng's signature interaction is The Checkpoint.**

#### What It Is

When you visit a constrained site, Boomrng does not immediately block or redirect. Instead, it shows a calm, full-screen page:

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│          twitter.com            │
│                                 │
│      This site is constrained.  │
│                                 │
│                                 │
│                                 │
│   ┌─────────────────────────┐   │
│   │    Return to work       │   │
│   └─────────────────────────┘   │
│                                 │
│        Continue anyway          │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

Two options. No timer. No countdown. No animation. No guilt.

- **"Return to work"** — Green, prominent, one click. Takes you back to where you were.
- **"Continue anyway"** — Gray, subtle, smaller text. Loads the site.

That's it.

#### Why It's the Signature

1. **It's unexpected.** Most blockers instantly redirect or show a scary page. Boomrng shows a calm page and asks you to choose.

2. **It's intentional.** You must make a conscious decision. You cannot click through on autopilot. The two buttons are visually distinct — the green one draws you back, the gray one requires effort.

3. **It's calm.** No exclamation marks. No red colors. No panic. Just a fact: "This site is constrained." And a choice.

4. **It's memorable.** People will tell others: "This extension asked me why I was going to Twitter, and I realized I didn't need to go."

5. **It's unique.** No other browser extension does this. One Sec uses breathing exercises. Others use instant blocks. Boomrng uses a moment of clarity.

6. **It reinforces the philosophy.** The Checkpoint embodies "intentional browsing." Every visit to a constrained site becomes a conscious decision.

#### How It Feels

- **First time:** Surprising. "Oh, I have to choose."
- **Second time:** Familiar. "Right, I set this constraint."
- **Tenth time:** Habitual. "Do I actually need to go here?"
- **Hundredth time:** Automatic. You start clicking "Return to work" without thinking. The habit is broken.

#### Technical Implementation

- Replace the current redirect in `rulesBuilder.js` with a redirect to `checkpoint.html`
- `checkpoint.html` reads the target URL from query params
- Shows the calm page with two buttons
- "Return to work" uses `history.back()` or closes the tab
- "Continue anyway" navigates to the original URL
- All logic runs client-side, no network requests

#### Configuration

Users can configure The Checkpoint per constraint:

- **Always show** — Default for all new constraints
- **Show once per session** — Only first visit triggers The Checkpoint
- **Never show** — Instant redirect (for sites that are always blocked)

This is configured in the Sites screen when adding or editing a constraint.

---

### 3. Constraint Behavior System

This is Boomrng's biggest differentiator. Not just blocking. Not just delays. A complete system of enforcement behaviors that users choose per site.

#### The Eight Behaviors

For every constrained website, users choose one of eight enforcement behaviors:

**1. Checkpoint** (Default)

The signature interaction. Calm page, two buttons, conscious decision.

- Feels like: A moment of clarity
- Best for: Sites you sometimes need for work
- Example: "I might need Twitter for work research, but I want to think first."

**2. Delay**

The site is unavailable for a set duration (5-120 minutes). A calm countdown page shows time remaining.

- Feels like: A pause before action
- Best for: Sites you check habitually
- Example: "I'll check Reddit, but not for 30 minutes."

**3. Progressive Delay**

First visit: 5 minutes. Second visit same day: 15 minutes. Third: 30 minutes. Escalates with each attempt.

- Feels like: Increasing friction
- Best for: Sites you can't stop checking
- Example: "The more I try to open Twitter, the longer I wait."

**4. Scheduled**

Site is only constrained during specific hours (e.g., 9am-5pm on weekdays). Outside those hours, the site is accessible.

- Feels like: Context-aware boundaries
- Best for: Sites that are fine outside work hours
- Example: "YouTube is blocked during work hours, but OK in the evening."

**5. PIN Required**

Must enter a 4-6 digit PIN to access the site. Each access requires the PIN.

- Feels like: Intentional override
- Best for: Sites you want to access rarely
- Example: "I can visit Reddit, but only if I'm willing to enter my PIN."

**6. Reflection**

Before the site loads, show a calm page for 5-10 seconds. No button to skip. Just wait. Then the site loads.

- Feels like: A forced pause
- Best for: Sites where you want to slow down
- Example: "I'll see Twitter, but I have to wait 10 seconds first."

**7. Hard Block**

Site is completely inaccessible. Redirects to the landing page. No way to bypass.

- Feels like: A firm boundary
- Best for: Sites you never need
- Example: "TikTok is simply not available."

**8. Custom Message**

Show a user-defined message before the site loads. The message appears for 5 seconds, then the site loads.

- Feels like: Personal reminder
- Best for: Sites where you want to remember why you constrained them
- Example: "You constrained this site because it wastes your time. Still want to go?"

#### How Users Configure It

In the Sites screen, when adding or editing a constraint:

```
ADD CONSTRAINT

Domain
┌─────────────────────────────┐
│  twitter.com                │
└─────────────────────────────┘

Behavior
┌─────────────────────────────┐
│  Checkpoint            [▾] │
└─────────────────────────────┘

Delay (if Delay or Progressive Delay selected)
┌─────────────────────────────┐
│  [30] minutes               │
└─────────────────────────────┘

Schedule (if Scheduled selected)
┌─────────────────────────────┐
│  Active: [9:00] to [17:00]  │
│  Days: [M] [T] [W] [T] [F] │
└─────────────────────────────┘

Custom Message (if Custom Message selected)
┌─────────────────────────────┐
│  You constrained this site  │
│  because it wastes time.    │
└─────────────────────────────┘

┌─────────────────────────────┐
│  ADD CONSTRAINT             │
└─────────────────────────────┘
```

#### How It Feels

The Constraint Behavior System makes Boomrng feel:

- **Opinionated** — Default is Checkpoint, not Hard Block. We believe in conscious decisions.
- **Flexible** — Users choose the right friction for each site.
- **Personal** — One site might be Hard Block, another might be Checkpoint. It depends on the user's relationship with that site.
- **Escalating** — Progressive Delay gets harder the more you try. This is the behavioral engine.

#### Why It Changes Behavior

Traditional blockers are binary: blocked or not. This creates a simple mental model: "I can't go there."

The Constraint Behavior System creates a nuanced mental model: "I can go there, but I have to choose." Or: "I can go there, but I have to wait." Or: "I can go there, but I have to enter my PIN."

This nuance is what changes behavior. It's not about prohibition. It's about intention.

---

### 4. Dashboard — Reduced to Essential

The dashboard should be understood in under five seconds. Every card that doesn't need to be there is removed.

#### What Stays

```
┌─────────────────────────────────┐
│                                 │
│  boomrng                        │
│                                 │
│  Tab budget: ████████░░ 7/10    │
│                                 │
│  Active constraints: 3          │
│                                 │
│  twitter.com     delayed 45m    │
│  youtube.com     checkpoint     │
│  reddit.com      hard block     │
│                                 │
│  ┌─────────────────────────────┐│
│  │  Strict Mode                ││
│  │  All delays become blocks   ││
│  │  Overrides require PIN      ││
│  │                     [OFF]   ││
│  └─────────────────────────────┘│
│                                 │
│  [Dashboard] [Sites] [Settings] │
│                                 │
└─────────────────────────────────┘
```

**What's shown:**

- **Tab budget** — Progress bar with count. Instant awareness.
- **Active constraints** — Count and list with status. What's enforced right now.
- **Strict Mode toggle** — One tap to escalate all constraints. No timer, no session, just a state.

**What's removed:**

- ~~Active Delays card~~ — Redundant. Delayed sites are already in the constraints list with countdown.
- ~~Today card~~ — "6 constraints enforced today" is data, not action. Remove it.
- ~~Constraint count in separate card~~ — Shown as a single line, not a card.

**Why Strict Mode replaces Focus:**

Strict Mode is a constraint feature, not a productivity feature. When active:

- All delays become hard blocks
- All checkpoints become hard blocks
- Intentional overrides require PIN (even for sites that normally don't)
- Tab budget is enforced more strictly (must close tabs immediately, not just warning)

Strict Mode has no timer. It stays on until the user turns it off. This is opinionated: Boomrng doesn't decide when you're done focusing. You do.

---

### 5. Product Glossary

Every word in Boomrng is intentional. This glossary defines the complete product language.

#### Core Concepts

| Term | Definition | Replaces |
|---|---|---|
| **Constraint** | A rule that limits access to a specific website | Blocked site |
| **Behavior** | How a constraint is enforced | Enforcement type |
| **Delay** | A time-limited restriction on a website | Timer |
| **Intentional Override** | A conscious bypass of a constraint, requiring PIN | Timer override |
| **Always Allowed** | A website that is never constrained | Whitelist, Allowed site |
| **Landing Page** | Where you're redirected when a constraint activates | Redirect URL |
| **Tab Budget** | The maximum number of tabs you allow yourself | Max tabs |
| **Strict Mode** | A state where all constraints are maximally enforced | Focus session |
| **Quiet Period** | A temporary suspension of all constraints | Pause |

#### UI Elements

| Term | Definition | Replaces |
|---|---|---|
| **The Checkpoint** | The calm page shown when visiting a constrained site | Block screen, Wall |
| **Tab Limit Page** | The page shown when tab budget is exceeded | The Wall |
| **Constraint List** | The list of all active constraints in the Sites screen | Blocked sites list |
| **Add Constraint** | The flow for creating a new constraint | Add site |
| **Apply** | Save and activate changes | Save settings |

#### Status Words

| Term | Definition | Replaces |
|---|---|---|
| **Active** | A constraint that is currently enforced | Enabled |
| **Inactive** | A constraint that is not currently enforced | Disabled |
| **Delayed** | A constraint with an active countdown | Timer running |
| **Enforced** | A constraint that has been triggered | Blocked |
| **Overridden** | A constraint that has been bypassed with PIN | Timer bypassed |

#### Actions

| Term | Definition | Replaces |
|---|---|---|
| **Add** | Create a new constraint | Add site |
| **Adjust** | Modify an existing constraint | Edit |
| **Remove** | Delete a constraint | Delete |
| **Enforce** | Activate a constraint | Block |
| **Delay** | Start a countdown for a constraint | Set timer |
| **Override** | Bypass a constraint with PIN | Bypass timer |

#### Messages

| Context | Message | Replaces |
|---|---|---|
| Constraint added | "Constraint applied." | "Settings saved." |
| Constraint removed | "Constraint removed." | "Site deleted." |
| PIN set | "PIN protection active." | "PIN saved." |
| Strict Mode on | "Strict Mode active." | "Focus mode on." |
| Strict Mode off | "Strict Mode off." | "Focus mode off." |
| Tab budget OK | "Tab budget maintained." | "Within limit." |
| Tab budget exceeded | "Tab budget exceeded." | "Too many tabs." |
| Quiet Period active | "Quiet Period active until [time]." | "Paused for [time]." |

---

### 6. Emotional UX

Every screen, every message, every state in Boomrng should feel calm, minimal, matter-of-fact, and confident.

#### Tone Rules

1. **No exclamation marks.** Ever.
2. **No emojis.** Ever.
3. **No celebration.** "Great job" is not in Boomrng's vocabulary.
4. **No guilt.** "You've been distracted 12 times" is judgmental.
5. **No urgency.** "Hurry! Close a tab!" is panic.
6. **State facts.** "3 constraints active." Not "You're doing great!"
7. **Use periods.** Not exclamation marks.
8. **Keep sentences short.** One line, one idea.
9. **Use active voice.** "Constraint applied." Not "Your settings have been saved."

#### Empty States

**No constraints:**
```
No constraints yet.

Add your first constraint to get started.
```

**No active delays:**
```
No active delays.
```

**No Always Allowed sites:**
```
No Always Allowed sites.
```

**No Strict Mode history:**
```
Strict Mode has not been activated.
```

#### Loading States

**Saving:**
```
Applying...
```
(A small spinner, nothing else)

**Loading settings:**
```
Loading...
```
(Skeleton placeholders)

**Initializing:**
```
boomrng
```
(Just the logo, no animation)

#### Blocking Screens

**Checkpoint (signature interaction):**
```
[domain]

This site is constrained.

[Return to work]    [Continue anyway]
```

**Hard Block:**
```
[domain]

This site is blocked.

[Return to work]
```

**Delay active:**
```
[domain]

This site is delayed.

Available in [time].

[Return to work]
```

**PIN required:**
```
[domain]

This site requires your PIN.

[PIN input]

[Return to work]    [Submit]
```

**Scheduled (outside active hours):**
```
[domain]

This site is scheduled to be available at [time].

[Return to work]
```

**Strict Mode active:**
```
[domain]

This site is blocked. Strict Mode is active.

[Return to work]
```

#### Success Messages

**Constraint added:**
```
Constraint applied.
```

**Constraint removed:**
```
Constraint removed.
```

**PIN set:**
```
PIN protection active.
```

**PIN changed:**
```
PIN updated.
```

**Settings applied:**
```
Settings applied.
```

**Quiet Period started:**
```
Quiet Period active until [time].
```

**Strict Mode toggled:**
```
Strict Mode active.
```
or
```
Strict Mode off.
```

#### Error Messages

**Invalid domain:**
```
Enter a valid domain (e.g., twitter.com).
```

**Duplicate constraint:**
```
This domain is already constrained.
```

**PIN mismatch:**
```
PINs do not match.
```

**PIN incorrect:**
```
Incorrect PIN.
```

**PIN too short:**
```
PIN must be 4-6 digits.
```

**Tab budget invalid:**
```
Tab budget must be a positive number.
```

**Landing page invalid:**
```
Enter a valid URL (e.g., https://github.com).
```

**Import failed:**
```
Invalid configuration file.
```

**Export failed:**
```
Export failed. Try again.
```

#### Onboarding

**First launch:**
```
Welcome to boomrng.

Add your first constraint to get started.
```

**Step 1:**
```
What sites do you want to constrain?

Enter a domain (e.g., twitter.com).
```

**Step 2:**
```
How should this constraint work?

[Checkpoint] is recommended.
```

**Step 3:**
```
Where should you land when a constraint activates?

[https://github.com]
```

**Step 4 (optional):**
```
Set a PIN to protect your constraints.

This prevents you from easily overriding them.
```

**Complete:**
```
Constraints applied.

Boomrng is now active.
```

---

### 7. Constraint Journey

The complete lifecycle of a constraint, from installation to daily use.

#### Journey Map

```
1. INSTALLATION
   User installs Boomrng
   Sees: "Welcome to boomrng."
   Feels: Calm, clear, no overwhelming options

2. FIRST CONSTRAINT
   User adds a domain
   Sees: "What sites do you want to constrain?"
   Feels: Simple, guided, opinionated (default is Checkpoint)

3. CONFIGURATION
   User chooses behavior
   Sees: "How should this constraint work?"
   Feels: Flexible, personal, not one-size-fits-all

4. LANDING PAGE
   User sets redirect destination
   Sees: "Where should you land when a constraint activates?"
   Feels: Purposeful, not arbitrary

5. FIRST ENFORCEMENT
   User visits constrained site
   Sees: The Checkpoint
   Feels: Surprising. "Oh, I have to choose."

6. DECISION
   User clicks "Return to work"
   Sees: Previous tab
   Feels: Empowered. "I chose not to go."

7. SECOND ENFORCEMENT
   User visits constrained site again
   Sees: The Checkpoint
   Feels: Familiar. "Right, I set this constraint."

8. OVERRIDE (optional)
   User clicks "Continue anyway"
   Sees: Site loads
   Feels: Conscious. "I chose to go."

9. DAILY USE
   User opens popup occasionally
   Sees: Tab budget, constraints, delays
   Feels: Aware, not overwhelmed

10. ADJUSTMENT
    User modifies a constraint
    Sees: Simple edit flow
    Feels: Flexible, not locked in

11. QUIET PERIOD (optional)
    User pauses constraints temporarily
    Sees: "Quiet Period active until [time]."
    Feels: In control, not rebellious

12. STRICT MODE (optional)
    User activates Strict Mode
    Sees: "Strict Mode active."
    Feels: Disciplined, intentional

13. REMOVAL
    User removes a constraint
    Sees: "Constraint removed."
    Feels: In control, not judged
```

#### How Boomrng Feels at Every Step

| Step | Emotion | Design Principle |
|---|---|---|
| Installation | Calm, clear | Progressive disclosure |
| First constraint | Simple, guided | Opinionated defaults |
| Configuration | Flexible, personal | User agency |
| First enforcement | Surprising, memorable | Signature interaction |
| Decision | Empowered, in control | Two clear options |
| Second enforcement | Familiar, habitual | Consistency |
| Override | Conscious, intentional | Friction without guilt |
| Daily use | Aware, calm | Minimal chrome |
| Adjustment | Flexible, not locked in | Easy to change |
| Quiet Period | In control, not rebellious | Temporary by design |
| Strict Mode | Disciplined, intentional | Opinionated escalation |
| Removal | In control, not judged | No guilt, no questions |

---

### 8. The Defining Feature — Constraint Behavior System

The Constraint Behavior System is Boomrng's defining feature. No other browser extension offers this level of behavioral customization with such simplicity.

#### What Makes It Unique

1. **Eight behaviors, not two.** Most blockers offer "block" or "don't block." Boomrng offers Checkpoint, Delay, Progressive Delay, Scheduled, PIN Required, Reflection, Hard Block, and Custom Message.

2. **Per-site configuration.** Twitter might be Checkpoint. YouTube might be Hard Block. Reddit might be Progressive Delay. Each site gets the right friction for the user's relationship with it.

3. **Opinionated defaults.** Checkpoint is the default, not Hard Block. We believe in conscious decisions, not prohibition.

4. **Escalating friction.** Progressive Delay gets harder the more you try. This is the behavioral engine — not a feature, but a system.

5. **Privacy-first.** All configuration stays local. No accounts, no sync, no tracking.

#### How It Becomes the Defining Feature

When people describe Boomrng, they should say:

> "It's the extension that lets you choose how blocked you want to be."

Not:
> "It's the extension that blocks websites."

Not:
> "It's the extension with analytics."

Not:
> "It's the extension with focus sessions."

The Constraint Behavior System is the story. It's what makes Boomrng different. It's what makes Boomrng better. It's what makes Boomrng worth choosing.

#### Marketing Copy

> "Boomrng doesn't just block websites. It lets you choose how much friction you want between you and your distractions."

> "Some sites need a gentle nudge. Others need a firm boundary. Boomrng lets you decide."

> "The Checkpoint asks you: 'Is this intentional?' That question changes everything."

---

### 9. Features Removed and Why

These features from the previous strategy were removed. Each removal strengthens Boomrng's identity.

| Feature | Reason for Removal |
|---|---|
| **Focus Screen** | Timer-based sessions are a productivity pattern. Boomrng is not a productivity app. Strict Mode replaces this as a constraint feature. |
| **Focus Score** | Gamification. Boomrng is not a game. Scores create anxiety, not intention. |
| **Weekly Reports** | Analytics. Boomrng is about behavior, not data. Reports belong in RescueTime. |
| **AI Insights** | Feature creep. Privacy concerns. Boomrng works locally. AI requires data. |
| **Streaks** | Gamification. Streaks create fear of breaking them, not intentional browsing. |
| **Heavy Analytics** | RescueTime territory. Boomrng enforces, not observes. |
| **Multi-profile** | Complexity over simplicity. One set of constraints is enough. |
| **Dark/Light mode toggle** | Nice-to-have, not essential. Dark mode fits the brand. |
| **Cross-browser (moved to long-term)** | Focus on Chrome depth, not breadth. |
| **Enterprise tier** | Wrong audience. Boomrng is for individuals. |
| **Calendar integration** | Feature creep. Boomrng is about browsing, not scheduling. |
| **Session recording** | Analytics. Boomrng doesn't track what you do. |
| **Break reminders** | Productivity feature. Boomrng is about constraints, not breaks. |
| **Custom blocking messages (as a feature)** | Replaced by Custom Message behavior in the Constraint Behavior System. |
| **Browsing streaks** | Gamification. Same reason as Streaks. |
| **Time saved calculator** | Analytics. Boomrng doesn't measure productivity. |
| **Most blocked sites ranking** | Analytics. Awareness comes from the Dashboard, not rankings. |
| **Tab usage patterns** | Analytics. Boomrng doesn't track patterns. |
| **Focus score gamification** | Same as Focus Score. |
| **Session logging** | Analytics. Boomrng doesn't record sessions. |
| **Site-specific tab limits** | Complexity. One tab budget is enough. |
| **Notification when timer expires** | Noise. The Dashboard shows active delays. |
| **Graduated restrictions** | Replaced by Progressive Delay in the Constraint Behavior System. |
| **Website Allowlist for Focus** | Productivity feature. Always Allowed serves this purpose. |

#### The Principle Behind Removals

Every removed feature falls into one of three categories:

1. **Analytics** — Boomrng observes, not reports. If it tracks data, it doesn't belong.
2. **Gamification** — Boomrng creates intention, not scores. If it gamifies behavior, it doesn't belong.
3. **Productivity** — Boomrng constrains, not produces. If it helps you work, it doesn't belong.

The product itself should embody the philosophy it teaches: restraint, intention, simplicity.

---

## Summary of Product Refinements

| Aspect | Before | After |
|---|---|---|
| Navigation | 4 screens | 3 screens |
| Signature interaction | None | The Checkpoint |
| Constraint behaviors | 2 (block/timer) | 8 (Checkpoint, Delay, Progressive Delay, Scheduled, PIN, Reflection, Hard Block, Custom Message) |
| Dashboard | 4 cards | 3 lines + Strict Mode |
| Focus feature | Dedicated screen | Strict Mode toggle |
| Product language | Generic | Custom glossary |
| Emotional tone | Inconsistent | Calm, minimal, matter-of-fact |
| Wow feature | None | Constraint Behavior System |
| Features removed | 0 | 25+ |

The product is smaller, calmer, and more opinionated. That's the point.
