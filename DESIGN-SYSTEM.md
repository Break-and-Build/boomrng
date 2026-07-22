# Boomrng Design System

> A design system for a behavioral constraint browser extension.
> Calm. Minimal. Opinionated. Premium.

---

## Design Principles

Every component in this system follows these principles:

1. **Calm over urgent** — No panic colors, no exclamation marks, no aggressive animations
2. **Minimal chrome** — The UI should disappear when you're browsing intentionally
3. **Purposeful color** — Every color communicates meaning, nothing is decorative
4. **Breathing room** — Whitespace is a feature, not wasted space
5. **Accessible by default** — Keyboard navigable, screen reader compatible, high contrast

---

## Foundations

### Color Tokens

Boomrng's color palette preserves the existing brand while extending it with semantic meaning.

#### Brand Colors

```css
:root {
  /* Primary Brand */
  --brand-bg: #003934;           /* Dark teal — primary background */
  --brand-accent: #00B242;       /* Bright green — primary accent */
  --brand-accent-hover: #00CC4C; /* Green — hover state */
  --brand-accent-muted: #00B24220; /* Green — 10% opacity, subtle backgrounds */

  /* Surfaces */
  --surface-primary: #003934;    /* Main background */
  --surface-secondary: #0D251D;  /* Card backgrounds, inputs */
  --surface-tertiary: #0A1F18;   /* Elevated surfaces, modals */
  --surface-overlay: #00000080;   /* Modal backdrop */
}
```

#### Text Colors

```css
:root {
  --text-primary: #FFFFFF;       /* Primary text, headings */
  --text-secondary: #B0B0B0;     /* Secondary text, labels */
  --text-tertiary: #808080;      /* Tertiary text, placeholders */
  --text-inverse: #000000;       /* Text on light backgrounds */
  --text-accent: #00B242;        /* Links, emphasis */
}
```

#### Semantic Colors

```css
:root {
  --color-success: #00B242;      /* Active, confirmed, within budget */
  --color-warning: #F5A623;      /* Approaching limit, caution */
  --color-error: #D32F2F;        /* Over limit, invalid, blocked */
  --color-info: #1976D2;         /* Informational, neutral */
}
```

#### Border Colors

```css
:root {
  --border-default: #234E3F;     /* Default borders */
  --border-hover: #2D6B54;       /* Hover state */
  --border-focus: #00B242;       /* Focus state */
  --border-error: #D32F2F;       /* Error state */
}
```

#### Badge Colors

```css
:root {
  --badge-green: #388E3C;        /* Within tab budget */
  --badge-orange: #F57C00;       /* Approaching tab limit */
  --badge-red: #D32F2F;          /* Over tab budget */
  --badge-blue: #1976D2;         /* No tab limit set */
  --badge-gray: #6E6E6E;         /* Inactive */
}
```

---

### Typography

Boomrng uses the system font stack for readability and performance. Monospace is reserved for tab counts and timer values.

#### Font Stacks

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
}
```

#### Type Scale

| Token | Size | Line Height | Weight | Use |
|---|---|---|---|---|
| `--text-display` | 24px | 32px | 600 | Page titles |
| `--text-heading` | 16px | 24px | 600 | Section headers |
| `--text-body` | 14px | 20px | 400 | Body text |
| `--text-label` | 12px | 16px | 500 | Labels, captions |
| `--text-micro` | 11px | 16px | 400 | Helper text, timestamps |
| `--text-mono` | 14px | 20px | 400 | Tab counts, timers |
| `--text-mono-lg` | 20px | 28px | 500 | Large timer displays |

#### Typography Rules

1. **Never use uppercase for labels.** Sentence case only.
2. **Never use bold for body text.** Weight 400 for body, 500 for labels, 600 for headings.
3. **Monospace only for data.** Tab counts, timers, domain names in checkpoints.
4. **Maximum 3 font sizes per screen.** Maintain hierarchy.

---

### Spacing Scale

A consistent 4px grid system.

```css
:root {
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

#### Spacing Rules

1. **Use consistent gaps.** 8px between related items, 16px between sections, 24px between major sections.
2. **Never use arbitrary spacing.** Always reference tokens.
3. **Padding inside cards:** 16px minimum.
4. **Margin between cards:** 12px.
5. **Input padding:** 10px vertical, 12px horizontal.

---

### Border Radius

```css
:root {
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```

#### Radius Rules

1. **Buttons:** 6px (small), 8px (default), 12px (large)
2. **Inputs:** 6px
3. **Cards:** 8px
4. **Modals:** 12px
5. **Toasts:** 8px
6. **Badges:** 9999px (pill)
7. **Progress bars:** 9999px (pill)

---

### Shadows

```css
:root {
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.6), 0 8px 16px rgba(0, 0, 0, 0.3);
}
```

#### Shadow Rules

1. **Cards:** `--shadow-xs` (resting), `--shadow-sm` (hover)
2. **Modals:** `--shadow-xl`
3. **Toasts:** `--shadow-lg`
4. **Dropdowns:** `--shadow-md`
5. **Buttons:** None (use background change for hover)
6. **Focus rings:** `0 0 0 2px var(--brand-accent)`

---

### Motion

```css
:root {
  --duration-instant: 0ms;
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 200ms;
  --duration-slower: 300ms;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

#### Motion Rules

1. **Hover states:** 150ms ease-out
2. **Focus states:** Instant (0ms)
3. **Screen transitions:** 200ms ease-in-out
4. **Modals:** 200ms ease-out (in), 150ms ease-in (out)
5. **Toasts:** 200ms ease-out (in), 150ms ease-in (out)
6. **Progress bars:** 300ms ease-out
7. **Micro-interactions:** 100ms ease-out
8. **Respect `prefers-reduced-motion`** — Disable all animations when set.

---

## Components

### Buttons

#### Variants

**Primary Button**
The main call-to-action. Used for "Return to work," "Apply," "Add Constraint."

```css
.btn-primary {
  background: var(--brand-accent);
  color: var(--text-inverse);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-default);
}

.btn-primary:hover {
  background: var(--brand-accent-hover);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Secondary Button**
Used for less prominent actions. "Continue anyway," "Cancel."

```css
.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 400;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-default);
}

.btn-secondary:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.btn-secondary:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}
```

**Ghost Button**
Text-only button for subtle actions. "Add Constraint," "+ Add."

```css
.btn-ghost {
  background: transparent;
  color: var(--text-accent);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 400;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-default);
}

.btn-ghost:hover {
  background: var(--brand-accent-muted);
}
```

**Danger Button**
Destructive actions. "Remove Constraint," "Delete."

```css
.btn-danger {
  background: var(--color-error);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-default);
}

.btn-danger:hover {
  background: #E53935;
}
```

**Icon Button**
For compact actions. Delete, close, menu.

```css
.btn-icon {
  background: transparent;
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-normal) var(--ease-default);
}

.btn-icon:hover {
  background: var(--surface-secondary);
  color: var(--text-primary);
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}
```

#### Sizes

| Size | Padding | Font Size | Height |
|---|---|---|---|
| Small | 6px 12px | 12px | 28px |
| Default | 10px 16px | 14px | 36px |
| Large | 12px 20px | 14px | 40px |

#### Button Rules

1. **One primary button per screen.** Maximum.
2. **Primary on the right.** Secondary on the left.
3. **Full-width buttons** for modals and checkpoint pages.
4. **Never stack buttons vertically** unless in a modal.
5. **Loading state:** Replace text with spinner, maintain width.

---

### Inputs

#### Text Input

```css
.input {
  width: 100%;
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  transition: border-color var(--duration-normal) var(--ease-default);
  box-sizing: border-box;
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:hover {
  border-color: var(--border-hover);
}

.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px var(--brand-accent-muted);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### Input States

| State | Border | Shadow |
|---|---|---|
| Default | `--border-default` | None |
| Hover | `--border-hover` | None |
| Focus | `--border-focus` | `0 0 0 2px var(--brand-accent-muted)` |
| Error | `--border-error` | `0 0 0 2px rgba(211, 47, 47, 0.2)` |
| Disabled | `--border-default` | None, 0.5 opacity |

#### Error State

```css
.input-error {
  border-color: var(--border-error);
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2);
}

.input-error-message {
  color: var(--color-error);
  font-size: 12px;
  margin-top: var(--space-1);
}
```

#### Label

```css
.label {
  display: block;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  margin-bottom: var(--space-2);
}

.label-required::after {
  content: ' *';
  color: var(--color-error);
}
```

#### Helper Text

```css
.helper {
  color: var(--text-tertiary);
  font-size: 12px;
  margin-top: var(--space-1);
}
```

#### Input Rules

1. **Always pair inputs with labels.** Never use placeholder as label.
2. **Helper text below inputs.** For additional context.
3. **Error messages below helper text.** Red color.
4. **Maximum 2 inputs per row.** Stack vertically otherwise.
5. **Monospace for domain inputs.** Use `--font-mono`.

---

### Select

```css
.select {
  width: 100%;
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 10px 32px 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23B0B0B0' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color var(--duration-normal) var(--ease-default);
}

.select:hover {
  border-color: var(--border-hover);
}

.select:focus {
  outline: none;
  border-color: var(--border-focus);
}
```

---

### Cards

Cards group related content. Used for constraints, settings sections, and information blocks.

```css
.card {
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: border-color var(--duration-normal) var(--ease-default),
              box-shadow var(--duration-normal) var(--ease-default);
}

.card:hover {
  border-color: var(--border-hover);
}

.card-interactive:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-sm);
}
```

#### Card Variants

**Default Card** — Static content, information display.

**Interactive Card** — Clickable, hover state with shadow lift.

**Inset Card** — Nested inside another card. Darker background.

```css
.card-inset {
  background: var(--surface-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}
```

#### Card Rules

1. **12px gap between cards.** Consistent spacing.
2. **16px padding inside cards.** Minimum.
3. **8px border radius.** Consistent with design language.
4. **Subtle borders.** Not heavy lines.
5. **Hover state for interactive cards.** Shadow lift + border change.

---

### Modals

Modals appear over content for focused actions. PIN entry, confirmations, adding constraints.

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn var(--duration-slow) var(--ease-out);
}

.modal {
  background: var(--surface-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  width: 100%;
  max-width: 320px;
  box-shadow: var(--shadow-xl);
  animation: slideUp var(--duration-slow) var(--ease-out);
}

.modal-header {
  margin-bottom: var(--space-4);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-body {
  margin-bottom: var(--space-6);
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
```

#### Modal Rules

1. **One modal at a time.** Never stack modals.
2. **Maximum width: 320px.** Keep it compact.
3. **Close on backdrop click.** Or Escape key.
4. **Focus trap.** Tab cycle stays within modal.
5. **Return focus on close.** To the element that opened it.

---

### Navigation

Bottom navigation bar. Three tabs: Dashboard, Sites, Settings.

```css
.nav {
  display: flex;
  justify-content: space-around;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-default);
  background: var(--surface-primary);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: color var(--duration-normal) var(--ease-default);
  cursor: pointer;
}

.nav-item:hover {
  color: var(--text-secondary);
}

.nav-item-active {
  color: var(--text-accent);
}
```

#### Navigation Rules

1. **Three tabs maximum.** Dashboard, Sites, Settings.
2. **Active state is accent color.** Not bold, not underline.
3. **No icons.** Text only. Keeps it minimal.
4. **Fixed at bottom.** Always visible.
5. **8px padding top/bottom.** Compact.

---

### Toasts

Brief, non-blocking notifications. Success, error, info.

```css
.toast-container {
  position: fixed;
  bottom: var(--space-16);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
}

.toast {
  background: var(--surface-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  color: var(--text-primary);
  animation: slideUp var(--duration-slow) var(--ease-out);
  max-width: 280px;
  text-align: center;
}

.toast-success {
  border-color: var(--color-success);
}

.toast-error {
  border-color: var(--color-error);
}

.toast-info {
  border-color: var(--color-info);
}
```

#### Toast Rules

1. **Auto-dismiss after 3 seconds.** No manual close needed.
2. **Maximum one toast at a time.** Queue if needed.
3. **Bottom center position.** Always.
4. **Simple text only.** No buttons, no actions.
5. **No icons.** Just text.

---

### Progress Bars

Used for tab budget visualization.

```css
.progress {
  width: 100%;
  height: 6px;
  background: var(--surface-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-slower) var(--ease-out),
              background var(--duration-normal) var(--ease-default);
}
```

#### Progress States

| State | Fill Color | When |
|---|---|---|
| Safe | `--badge-green` | Below 70% of budget |
| Warning | `--badge-orange` | 70-90% of budget |
| Over | `--badge-red` | Over budget |

#### Progress Rules

1. **Always pill-shaped.** `border-radius: 9999px`.
2. **6px height.** Not too thin, not too thick.
3. **Animated transitions.** 300ms ease-out.
4. **Color changes with state.** Green → Orange → Red.
5. **No labels on the bar itself.** Label below.

---

### Badges

Small status indicators. Used in lists and dashboards.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
}

.badge-active {
  background: var(--brand-accent-muted);
  color: var(--brand-accent);
}

.badge-delayed {
  background: rgba(245, 166, 35, 0.15);
  color: var(--color-warning);
}

.badge-blocked {
  background: rgba(211, 47, 47, 0.15);
  color: var(--color-error);
}

.badge-inactive {
  background: rgba(110, 110, 110, 0.15);
  color: var(--text-tertiary);
}
```

---

### Empty States

When a section has no content.

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
}

.empty-state-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

.empty-state-description {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0 0 var(--space-4);
  max-width: 240px;
}
```

#### Empty State Copy

| Context | Title | Description |
|---|---|---|
| No constraints | No constraints yet | Add your first constraint to get started |
| No active delays | No active delays | — |
| No Always Allowed | No Always Allowed sites | — |
| No strict mode | Strict Mode has not been activated | — |

#### Empty State Rules

1. **Centered content.** Horizontally and vertically.
2. **No icons.** Text only.
3. **Action button below.** Ghost button for adding.
4. **Maximum 2 lines of text.** Keep it brief.
5. **Generous padding.** 48px top/bottom.

---

### Loading States

```css
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-default);
  border-top-color: var(--brand-accent);
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

#### Loading Rules

1. **Spinner only.** No text unless necessary.
2. **16px spinner.** Small and unobtrusive.
3. **Replace button text.** During save/apply actions.
4. **Skeleton screens.** For initial page loads.
5. **No loading bars.** Unless it's a progress bar for tab budget.

---

### Error States

Inline validation messages.

```css
.error-message {
  color: var(--color-error);
  font-size: 12px;
  margin-top: var(--space-1);
}

.error-banner {
  background: rgba(211, 47, 47, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-error);
  font-size: 14px;
  margin-bottom: var(--space-4);
}
```

#### Error Rules

1. **Inline errors preferred.** Below the invalid input.
2. **Banner errors for form-level.** At the top of the form.
3. **Red color only.** No other error colors.
4. **No icons.** Text only.
5. **Dismiss on fix.** Error disappears when input becomes valid.

---

## Pages

### Checkpoint Page

The signature interaction. Shown when visiting a constrained site.

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│           twitter.com               │
│                                     │
│       This site is constrained.     │
│                                     │
│                                     │
│                                     │
│    ┌───────────────────────────┐    │
│    │     Return to work        │    │
│    └───────────────────────────┘    │
│                                     │
│          Continue anyway            │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

#### Styles

```css
.checkpoint-page {
  background: var(--surface-primary);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
}

.checkpoint-domain {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.checkpoint-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--space-8);
}

.checkpoint-primary {
  width: 100%;
  max-width: 280px;
}

.checkpoint-secondary {
  margin-top: var(--space-4);
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
  background: none;
  border: none;
  padding: var(--space-2);
}

.checkpoint-secondary:hover {
  color: var(--text-secondary);
}
```

#### Rules

1. **Full viewport height.** Takes over the screen.
2. **Centered content.** Vertically and horizontally.
3. **Domain in monospace.** Clear, prominent.
4. **Message below domain.** Calm, matter-of-fact.
5. **Primary button full-width.** Green, prominent.
6. **Secondary as plain text.** Below the button, subtle.
7. **No icons, no decoration.** Pure minimalism.

---

### Delay Page

Shown when a site is delayed. Countdown visible.

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│           twitter.com               │
│                                     │
│        This site is delayed.        │
│                                     │
│            23:45                    │
│                                     │
│         remaining                   │
│                                     │
│                                     │
│    ┌───────────────────────────┐    │
│    │     Return to work        │    │
│    └───────────────────────────┘    │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

#### Styles

```css
.delay-page {
  background: var(--surface-primary);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
}

.delay-domain {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.delay-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.delay-timer {
  font-family: var(--font-mono);
  font-size: 48px;
  font-weight: 500;
  color: var(--color-warning);
  letter-spacing: 2px;
  margin-bottom: var(--space-2);
}

.delay-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-8);
}
```

#### Rules

1. **Timer is the focal point.** Large, monospace, warning color.
2. **Countdown updates live.** Every second.
3. **No skip button.** The delay is the point.
4. **Return to work button.** Full-width, green.
5. **Timer color: warning.** Amber, not red.

---

### PIN Page

Shown when PIN is required to access a site.

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│           twitter.com               │
│                                     │
│     This site requires your PIN.    │
│                                     │
│         ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│         │ • │ │ • │ │   │ │   │    │
│         └───┘ └───┘ └───┘ └───┘    │
│                                     │
│                                     │
│    ┌───────────────────────────┐    │
│    │     Return to work        │    │
│    └───────────────────────────┘    │
│                                     │
│          Enter PIN to continue      │
│                                     │
└─────────────────────────────────────┘
```

#### Styles

```css
.pin-page {
  background: var(--surface-primary);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
}

.pin-domain {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.pin-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.pin-input-group {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
}

.pin-digit {
  width: 48px;
  height: 56px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 24px;
  text-align: center;
  color: var(--text-primary);
}

.pin-digit:focus {
  border-color: var(--border-focus);
  outline: none;
  box-shadow: 0 0 0 2px var(--brand-accent-muted);
}
```

#### Rules

1. **4-6 digit PIN.** Separate inputs for each digit.
2. **Auto-advance.** Focus moves to next digit on input.
3. **Auto-submit.** When all digits entered, submit automatically.
4. **Error shake.** On incorrect PIN, shake animation.
5. **No visibility toggle.** PIN is always masked.

---

### Tab Budget Page

The Wall — shown when tab budget is exceeded.

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│       Tab budget exceeded           │
│                                     │
│    You have 13 tabs open.           │
│    Your budget is 10.               │
│                                     │
│    Close 3 tabs to continue.        │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  github.com            [×] │  │
│    │  docs.python.org       [×] │  │
│    │  stackoverflow.com     [×] │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌───────────────────────────┐    │
│    │   Close 3 oldest tabs    │    │
│    └───────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

#### Styles

```css
.budget-page {
  background: var(--surface-primary);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
}

.budget-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}

.budget-stats {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-6);
}

.budget-instruction {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.budget-tabs {
  width: 100%;
  max-width: 280px;
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  text-align: left;
}

.budget-tab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-default);
}

.budget-tab:last-child {
  border-bottom: none;
}

.budget-tab-domain {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
}

.budget-tab-close {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: var(--space-1);
}

.budget-tab-close:hover {
  color: var(--color-error);
}
```

#### Rules

1. **Actionable.** List of tabs with close buttons.
2. **One-click close.** "Close 3 oldest tabs" button.
3. **Domain in monospace.** Clear identification.
4. **No drama.** "Tab budget exceeded" not "LIMIT REACHED."
5. **Stats above.** Current tabs vs budget.

---

## Accessibility

### Focus Management

```css
:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

### Keyboard Navigation

| Key | Action |
|---|---|
| Tab | Move focus forward |
| Shift+Tab | Move focus backward |
| Enter | Activate button/link |
| Space | Activate button |
| Escape | Close modal/popup |
| Arrow keys | Navigate lists, tabs |

### ARIA Labels

| Element | aria-label |
|---|---|
| Primary button | Action description (e.g., "Add constraint") |
| Icon button | Action description (e.g., "Remove constraint") |
| Navigation item | Screen name (e.g., "Dashboard") |
| Progress bar | "Tab budget: 7 of 10 used" |
| Badge | Status (e.g., "Delayed, 45 minutes remaining") |
| Modal | "Add constraint dialog" |
| Toast | "Constraint applied" |

### Screen Reader Support

1. **All interactive elements** must be keyboard accessible.
2. **All images** must have alt text.
3. **Dynamic content** uses `aria-live="polite"`.
4. **Form fields** have associated labels.
5. **Error messages** use `aria-live="assertive"`.
6. **Modals** trap focus and return focus on close.

### Contrast Requirements

| Element | Minimum Ratio |
|---|---|
| Normal text | 4.5:1 |
| Large text (18px+) | 3:1 |
| UI components | 3:1 |
| Focus indicators | 3:1 |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Motion Guidelines

### Transitions

| Element | Property | Duration | Easing |
|---|---|---|---|
| Button hover | background | 150ms | ease-out |
| Button press | transform | 100ms | ease-out |
| Input focus | border, shadow | 150ms | ease-out |
| Card hover | border, shadow | 150ms | ease-out |
| Toast enter | transform, opacity | 200ms | ease-out |
| Toast exit | transform, opacity | 150ms | ease-in |
| Modal enter | transform, opacity | 200ms | ease-out |
| Modal exit | transform, opacity | 150ms | ease-in |
| Progress bar | width | 300ms | ease-out |
| Screen transition | opacity | 200ms | ease-in-out |
| Spinner | transform | 600ms | linear |

### Keyframes

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Motion Rules

1. **Subtle, not celebratory.** Animations guide attention, never distract.
2. **Fast, not instant.** 150-200ms feels responsive, not sluggish.
3. **Consistent easing.** Use `ease-out` for enters, `ease-in` for exits.
4. **Respect user preference.** Always check `prefers-reduced-motion`.
5. **No looping animations** except spinners.
6. **No bounce effects** except for subtle feedback (toast appear).

---

## Iconography

Boomrng uses simple, minimal SVG icons. 16px for UI, 24px for checkpoints.

### Icon Set

| Icon | Usage | Size |
|---|---|---|
| Close (×) | Remove constraint, close tab | 16px |
| Plus (+) | Add constraint | 16px |
| Check (✓) | Success, active state | 16px |
| Arrow left (←) | Back navigation | 16px |
| Clock (◷) | Delay active | 16px |
| Lock (🔒) | PIN required | 16px |
| Shield (🛡) | Hard block | 16px |
| Pause (⏸) | Strict Mode | 16px |

### Icon Rules

1. **Stroke-based.** 1.5px stroke weight.
2. **Consistent size.** 16px for UI, 24px for large displays.
3. **currentColor.** Inherits text color.
4. **No filled icons.** Stroke only.
5. **Minimal detail.** 2-3 visual elements maximum.

---

## Complete Token Reference

```css
:root {
  /* Colors - Brand */
  --brand-bg: #003934;
  --brand-accent: #00B242;
  --brand-accent-hover: #00CC4C;
  --brand-accent-muted: #00B24220;

  /* Colors - Surfaces */
  --surface-primary: #003934;
  --surface-secondary: #0D251D;
  --surface-tertiary: #0A1F18;
  --surface-overlay: #00000080;

  /* Colors - Text */
  --text-primary: #FFFFFF;
  --text-secondary: #B0B0B0;
  --text-tertiary: #808080;
  --text-inverse: #000000;
  --text-accent: #00B242;

  /* Colors - Semantic */
  --color-success: #00B242;
  --color-warning: #F5A623;
  --color-error: #D32F2F;
  --color-info: #1976D2;

  /* Colors - Borders */
  --border-default: #234E3F;
  --border-hover: #2D6B54;
  --border-focus: #00B242;
  --border-error: #D32F2F;

  /* Colors - Badges */
  --badge-green: #388E3C;
  --badge-orange: #F57C00;
  --badge-red: #D32F2F;
  --badge-blue: #1976D2;
  --badge-gray: #6E6E6E;

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;

  --text-display: 24px;
  --text-heading: 16px;
  --text-body: 14px;
  --text-label: 12px;
  --text-micro: 11px;

  /* Spacing */
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border Radius */
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.6), 0 8px 16px rgba(0, 0, 0, 0.3);

  /* Motion */
  --duration-instant: 0ms;
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 200ms;
  --duration-slower: 300ms;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## File Structure

```
src/
├── popup/
│   └── styles/
│       ├── tokens.css        /* All design tokens */
│       ├── reset.css         /* CSS reset */
│       ├── base.css          /* Base element styles */
│       ├── components.css    /* Button, input, card, etc. */
│       ├── layout.css        /* Navigation, grid, spacing */
│       ├── pages.css         /* Checkpoint, delay, pin, budget */
│       └── utilities.css     /* Helper classes */
```

---

## Summary

This design system provides everything needed to build Boomrng's UI:

- **Complete token system** with colors, typography, spacing, radius, shadows, and motion
- **Component library** with buttons, inputs, cards, modals, navigation, toasts, progress bars
- **Page templates** for checkpoint, delay, PIN, and tab budget screens
- **Accessibility guidelines** for keyboard navigation, screen readers, contrast, and reduced motion
- **Motion guidelines** for animations and transitions
- **Iconography** rules and usage

Every component follows the design principles: calm, minimal, purposeful, accessible. The system preserves Boomrng's brand colors while extending them with semantic meaning.

The design system is ready for implementation.