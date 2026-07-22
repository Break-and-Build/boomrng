# Boomrng v2 — Component Architecture

> A complete frontend architecture for building Boomrng.
> Every component defined. Every screen composed. Every interaction specified.
>
> This document is the single source of truth for implementation.

---

## Architecture Principles

1. **Components compose screens.** Screens do not contain logic beyond routing.
2. **Props flow down.** Events flow up. No prop drilling beyond 2 levels.
3. **Generic components know nothing about Boomrng.** Feature components know everything.
4. **State lives in the storage module.** Components are stateless when possible.
5. **Accessibility is not optional.** Every component includes ARIA and keyboard support.

---

## Folder Structure

```
src/
├── popup/
│   ├── index.html
│   ├── popup.js                    # Entry point, screen routing
│   ├── styles/
│   │   ├── tokens.css              # Design tokens
│   │   ├── reset.css               # CSS reset
│   │   ├── base.css                # Base element styles
│   │   ├── components.css          # Foundation components
│   │   ├── layout.css              # Layout components
│   │   ├── screens.css             # Screen-specific styles
│   │   └── pages.css               # Enforcement page styles
│   ├── components/
│   │   ├── foundation/             # Generic, reusable
│   │   │   ├── Button/
│   │   │   │   ├── Button.js
│   │   │   │   └── Button.css
│   │   │   ├── Input/
│   │   │   │   ├── Input.js
│   │   │   │   └── Input.css
│   │   │   ├── Select/
│   │   │   │   ├── Select.js
│   │   │   │   └── Select.css
│   │   │   ├── Modal/
│   │   │   │   ├── Modal.js
│   │   │   │   └── Modal.css
│   │   │   ├── Toast/
│   │   │   │   ├── Toast.js
│   │   │   │   └── Toast.css
│   │   │   ├── Card/
│   │   │   │   ├── Card.js
│   │   │   │   └── Card.css
│   │   │   ├── Badge/
│   │   │   │   ├── Badge.js
│   │   │   │   └── Badge.css
│   │   │   ├── ProgressBar/
│   │   │   │   ├── ProgressBar.js
│   │   │   │   └── ProgressBar.css
│   │   │   ├── Spinner/
│   │   │   │   ├── Spinner.js
│   │   │   │   └── Spinner.css
│   │   │   └── Divider/
│   │   │       ├── Divider.js
│   │   │       └── Divider.css
│   │   ├── layout/                 # Layout primitives
│   │   │   ├── AppShell/
│   │   │   │   └── AppShell.js
│   │   │   ├── PageContainer/
│   │   │   │   └── PageContainer.js
│   │   │   ├── Header/
│   │   │   │   └── Header.js
│   │   │   ├── BottomNavigation/
│   │   │   │   └── BottomNavigation.js
│   │   │   ├── Section/
│   │   │   │   └── Section.js
│   │   │   ├── Stack/
│   │   │   │   └── Stack.js
│   │   │   └── Grid/
│   │   │       └── Grid.js
│   │   ├── dashboard/              # Dashboard-specific
│   │   │   ├── ConstraintSummary.js
│   │   │   ├── ConstraintList.js
│   │   │   ├── ConstraintRow.js
│   │   │   ├── TabBudget.js
│   │   │   ├── StrictModeCard.js
│   │   │   └── StatusBadge.js
│   │   ├── constraints/            # Constraint management
│   │   │   ├── ConstraintCard.js
│   │   │   ├── ConstraintEditor.js
│   │   │   ├── ConstraintBehaviorPicker.js
│   │   │   ├── BehaviorBadge.js
│   │   │   ├── ConstraintFilters.js
│   │   │   ├── AddConstraintModal.js
│   │   │   └── EditConstraintModal.js
│   │   ├── enforcement/            # Enforcement pages
│   │   │   ├── CheckpointScreen.js
│   │   │   ├── DelayScreen.js
│   │   │   ├── PinScreen.js
│   │   │   ├── HardBlockScreen.js
│   │   │   └── TabBudgetScreen.js
│   │   ├── settings/               # Settings components
│   │   │   ├── SettingsGroup.js
│   │   │   ├── SettingsRow.js
│   │   │   ├── Toggle.js
│   │   │   ├── NumberInput.js
│   │   │   ├── PinSetup.js
│   │   │   └── ImportExport.js
│   │   └── feedback/               # Feedback components
│   │       ├── EmptyState.js
│   │       ├── LoadingState.js
│   │       ├── ErrorState.js
│   │       └── ConfirmationDialog.js
│   ├── screens/
│   │   ├── Dashboard.js            # Dashboard screen
│   │   ├── Sites.js                # Sites screen
│   │   └── Settings.js             # Settings screen
│   └── shared/
│       ├── storage.js              # Chrome storage wrapper
│       ├── rules-builder.js        # DeclarativeNetRequest rules
│       ├── constants.js            # Shared constants
│       └── utils.js                # Utility functions
├── background/
│   ├── service-worker.js
│   ├── enforcement.js
│   ├── tab-manager.js
│   ├── badge.js
│   └── scheduler.js
├── limit/
│   ├── index.html
│   └── limit.js
└── checkpoint/
    ├── index.html
    └── checkpoint.js
```

---

## Component Layers

```
┌─────────────────────────────────────────────────┐
│                    Screens                       │
│  Dashboard │ Sites │ Settings │ Enforcement     │
├─────────────────────────────────────────────────┤
│                Feature Components                │
│  ConstraintCard │ TabBudget │ StrictModeCard    │
├─────────────────────────────────────────────────┤
│                 Layout Components                │
│  AppShell │ Header │ BottomNavigation │ Section │
├─────────────────────────────────────────────────┤
│               Foundation Components              │
│  Button │ Input │ Card │ Modal │ Toast │ Badge  │
├─────────────────────────────────────────────────┤
│                  Design Tokens                   │
│  Colors │ Typography │ Spacing │ Shadows │ Motion│
└─────────────────────────────────────────────────┘
```

**Rules:**
- Foundation components are generic. They know nothing about Boomrng.
- Layout components are generic. They handle structure only.
- Feature components know about Boomrng. They use foundation and layout.
- Screens compose feature components. They handle routing and state.

---

## Foundation Components

---

### Button

**Purpose:** Trigger actions.

**Responsibilities:**
- Render with correct variant, size, and state
- Handle click events
- Show loading state when async action is in progress
- Support keyboard activation (Enter, Space)

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Visual style |
| `size` | `'small' \| 'default' \| 'large'` | `'default'` | Button size |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `loading` | `boolean` | `false` | Show spinner, prevent interaction |
| `fullWidth` | `boolean` | `false` | Take full container width |
| `onClick` | `() => void` | — | Click handler |
| `children` | `string \| Node` | — | Button content |
| `ariaLabel` | `string` | — | Accessible label (required if no text content) |
| `type` | `'button' \| 'submit'` | `'button'` | HTML button type |

**Variants:**

| Variant | Background | Text Color | Use |
|---|---|---|---|
| `primary` | `--brand-accent` | `--text-inverse` | Main actions |
| `secondary` | transparent | `--text-secondary` | Alternative actions |
| `ghost` | transparent | `--text-accent` | Subtle actions |
| `danger` | `--color-error` | `--text-primary` | Destructive actions |

**States:**

| State | Visual Change |
|---|---|
| Default | Base styles |
| Hover | Background lighten (primary, danger), border change (secondary), background tint (ghost) |
| Focus | `outline: 2px solid --brand-accent; outline-offset: 2px` |
| Active | `transform: scale(0.98)` |
| Disabled | `opacity: 0.5; cursor: not-allowed` |
| Loading | Spinner replaces text, maintain width |

**Accessibility:**
- Always has `role="button"`
- `aria-label` required when button contains only icon
- `aria-disabled="true"` when disabled
- `aria-busy="true"` when loading
- Focus visible with 2px outline

**Keyboard Interactions:**
- `Enter` — Activates button
- `Space` — Activates button
- `Tab` — Moves focus to/from button

**Animations:**
- Hover: 150ms ease-out background change
- Active: 100ms ease-out scale(0.98)
- Loading: Spinner rotates 600ms linear infinite

**Composition Rules:**
- Maximum one primary button per container
- Primary button on the right, secondary on the left
- Full-width buttons in modals and enforcement pages
- Icon buttons use only icon, no text

**Usage Example:**
```javascript
// Primary action
Button({ variant: 'primary', onClick: save, children: 'Apply' })

// Loading state
Button({ variant: 'primary', loading: true, children: 'Applying...' })

// Icon button
Button({ variant: 'icon', ariaLabel: 'Remove constraint', onClick: remove, children: Icon('close') })
```

---

### Input

**Purpose:** Capture text input from the user.

**Responsibilities:**
- Render with label, helper text, and error message
- Handle focus, blur, and input events
- Show validation states
- Support placeholder text

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Input label (required) |
| `value` | `string` | `''` | Controlled value |
| `placeholder` | `string` | — | Placeholder text |
| `type` | `'text' \| 'number' \| 'password'` | `'text'` | Input type |
| `helperText` | `string` | — | Helper text below input |
| `error` | `string` | — | Error message (shows error state) |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `required` | `boolean` | `false` | Mark as required |
| `monospace` | `boolean` | `false` | Use monospace font |
| `onChange` | `(value: string) => void` | — | Input change handler |
| `onBlur` | `() => void` | — | Blur handler |
| `id` | `string` | — | HTML id (auto-generated if not provided) |

**Variants:**

| Variant | Description |
|---|---|
| Default | Standard text input |
| Number | Numeric input with step controls |
| Password | Masked input |

**States:**

| State | Visual Change |
|---|---|
| Default | `border: --border-default` |
| Hover | `border: --border-hover` |
| Focus | `border: --border-focus; box-shadow: 0 0 0 2px --brand-accent-muted` |
| Error | `border: --border-error; box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2)` |
| Disabled | `opacity: 0.5; cursor: not-allowed` |

**Accessibility:**
- Input has `id` matching label's `for`
- `aria-describedby` points to helper text or error message
- `aria-invalid="true"` when error is present
- `aria-required="true"` when required
- Label is always visible (never placeholder-only)

**Keyboard Interactions:**
- `Tab` — Moves focus to/from input
- `Escape` — Clears input (optional)
- `Enter` — Submits form (if inside form)

**Animations:**
- Focus: 150ms ease-out border and shadow change
- Error: Instant border change, no animation

**Composition Rules:**
- Always pair with a label
- Helper text goes below input
- Error message replaces helper text when present
- Maximum 2 inputs per row
- Monospace for domain names and URLs

**Usage Example:**
```javascript
// Standard input
Input({ label: 'Domain', placeholder: 'twitter.com', monospace: true })

// Input with error
Input({ label: 'Domain', value: 'invalid', error: 'Enter a valid domain (e.g., twitter.com).' })

// Number input
Input({ label: 'Tab Budget', type: 'number', placeholder: 'e.g., 10' })
```

---

### Select

**Purpose:** Choose one option from a list.

**Responsibilities:**
- Render dropdown with options
- Handle selection changes
- Show current selection
- Support keyboard navigation

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Select label (required) |
| `value` | `string` | `''` | Current selected value |
| `options` | `Array<{ value: string, label: string }>` | `[]` | Available options |
| `placeholder` | `string` | `'Select...'` | Placeholder text |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `onChange` | `(value: string) => void` | — | Selection change handler |
| `id` | `string` | — | HTML id |

**States:**

| State | Visual Change |
|---|---|
| Default | `border: --border-default` |
| Hover | `border: --border-hover` |
| Focus | `border: --border-focus` |
| Disabled | `opacity: 0.5` |

**Accessibility:**
- Uses native `<select>` element
- Label has `for` attribute matching select `id`
- `aria-describedby` for helper text
- `aria-disabled` when disabled

**Keyboard Interactions:**
- `Arrow Up/Down` — Navigate options
- `Enter` — Select option
- `Escape` — Close dropdown
- `Tab` — Move focus to/from select

**Composition Rules:**
- Always pair with a label
- Used for behavior selection, category selection
- Maximum 12 options before considering a different pattern

**Usage Example:**
```javascript
Select({
  label: 'Behavior',
  value: 'checkpoint',
  options: [
    { value: 'checkpoint', label: 'Checkpoint' },
    { value: 'delay', label: 'Delay' },
    { value: 'hard-block', label: 'Hard Block' }
  ],
  onChange: setBehavior
})
```

---

### Modal

**Purpose:** Display focused content over the main UI.

**Responsibilities:**
- Render backdrop and modal container
- Trap focus within modal
- Handle close on backdrop click, Escape key
- Return focus to trigger element on close
- Announce to screen readers

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | `false` | Show/hide modal |
| `onClose` | `() => void` | — | Close handler (required) |
| `title` | `string` | — | Modal title |
| `children` | `Node` | — | Modal content |
| `footer` | `Node` | — | Modal footer (buttons) |
| `size` | `'small' \| 'default'` | `'default'` | Modal width |

**States:**

| State | Visual Change |
|---|---|
| Open | Backdrop fades in, modal slides up |
| Closed | Backdrop fades out, modal slides down |

**Accessibility:**
- `role="dialog"` on modal container
- `aria-modal="true"` on modal container
- `aria-labelledby` points to modal title
- Focus trapped within modal (Tab cycles)
- Focus returns to trigger element on close
- Backdrop click closes modal
- Escape key closes modal

**Keyboard Interactions:**
- `Escape` — Closes modal
- `Tab` — Cycles through focusable elements within modal
- `Shift+Tab` — Cycles backwards

**Animations:**
- Open: 200ms ease-out fade in backdrop, slide up modal
- Close: 150ms ease-in fade out backdrop, slide down modal

**Composition Rules:**
- One modal at a time
- Maximum width: 320px
- Title at top, content in middle, footer at bottom
- Footer contains action buttons (secondary left, primary right)

**Usage Example:**
```javascript
Modal({
  isOpen: showAddModal,
  onClose: () => setShowAddModal(false),
  title: 'Add Constraint',
  children: ConstraintEditor({ onSave: addConstraint }),
  footer: [
    Button({ variant: 'secondary', onClick: () => setShowAddModal(false), children: 'Cancel' }),
    Button({ variant: 'primary', onClick: saveConstraint, children: 'Add Constraint' })
  ]
})
```

---

### Toast

**Purpose:** Display brief, non-blocking notifications.

**Responsibilities:**
- Show message at bottom of screen
- Auto-dismiss after timeout
- Support success, error, info variants
- Queue toasts if multiple triggered

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | — | Toast message (required) |
| `variant` | `'success' \| 'error' \| 'info'` | `'success'` | Visual style |
| `duration` | `number` | `3000` | Auto-dismiss time in ms |

**Variants:**

| Variant | Border Color | Use |
|---|---|---|
| `success` | `--color-success` | Actions completed |
| `error` | `--color-error` | Actions failed |
| `info` | `--color-info` | Informational |

**Accessibility:**
- `role="status"` on toast container
- `aria-live="polite"` for screen reader announcement
- Toast is visually distinct from background

**Keyboard Interactions:**
- No keyboard interaction (auto-dismiss)
- Can be dismissed early with Escape (optional)

**Animations:**
- Enter: 200ms ease-out slide up + fade in
- Exit: 150ms ease-in slide down + fade out

**Composition Rules:**
- Maximum one toast visible at a time
- Bottom center position
- Text only, no buttons
- No icons
- Auto-dismiss after 3 seconds

**Usage Example:**
```javascript
// Show success toast
Toast({ message: 'Constraint applied.', variant: 'success' })

// Show error toast
Toast({ message: 'Invalid domain.', variant: 'error' })
```

---

### Card

**Purpose:** Group related content.

**Responsibilities:**
- Render container with background, border, padding
- Support hover state for interactive cards
- Handle click for interactive cards

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `interactive` | `boolean` | `false` | Enable hover/click states |
| `onClick` | `() => void` | — | Click handler (required if interactive) |
| `children` | `Node` | — | Card content |
| `className` | `string` | — | Additional CSS class |

**Variants:**

| Variant | Background | Use |
|---|---|---|
| Default | `--surface-secondary` | Static content |
| Interactive | `--surface-secondary` | Clickable content |
| Inset | `--surface-tertiary` | Nested content |

**States:**

| State | Visual Change |
|---|---|
| Default | `border: --border-default` |
| Hover (interactive) | `border: --border-hover; box-shadow: --shadow-sm` |

**Accessibility:**
- Interactive cards have `role="button"` and `tabindex="0"`
- Interactive cards respond to Enter and Space
- Non-interactive cards have no special requirements

**Keyboard Interactions:**
- `Enter` — Activates interactive card
- `Space` — Activates interactive card
- `Tab` — Moves focus to/from interactive card

**Animations:**
- Hover: 150ms ease-out border and shadow change

**Composition Rules:**
- 12px gap between cards
- 16px padding inside cards
- 8px border radius
- Cards can contain other components

**Usage Example:**
```javascript
// Static card
Card({ children: [
  Text({ children: 'Active constraints: 3' })
]})

// Interactive card
Card({ interactive: true, onClick: editConstraint, children: [
  ConstraintRow({ domain: 'twitter.com', behavior: 'checkpoint' })
]})
```

---

### Badge

**Purpose:** Display status information.

**Responsibilities:**
- Render small, pill-shaped indicator
- Show status text with appropriate color
- Support different status types

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'active' \| 'delayed' \| 'blocked' \| 'inactive'` | `'active'` | Status type |
| `children` | `string` | — | Badge text |
| `dot` | `boolean` | `false` | Show colored dot before text |

**Variants:**

| Variant | Background | Text Color | Use |
|---|---|---|---|
| `active` | `--brand-accent-muted` | `--brand-accent` | Active constraint |
| `delayed` | `rgba(245, 166, 35, 0.15)` | `--color-warning` | Delay in progress |
| `blocked` | `rgba(211, 47, 47, 0.15)` | `--color-error` | Hard block |
| `inactive` | `rgba(110, 110, 110, 0.15)` | `--text-tertiary` | Inactive constraint |

**Accessibility:**
- `role="status"` on badge
- Color is not the only indicator (text provides context)
- Sufficient contrast ratio (3:1 minimum)

**Composition Rules:**
- Inline element
- Maximum one badge per row item
- Text is always visible (no icon-only badges)

**Usage Example:**
```javascript
Badge({ variant: 'delayed', children: '45m remaining' })
Badge({ variant: 'active', dot: true, children: 'Checkpoint' })
```

---

### ProgressBar

**Purpose:** Visualize progress toward a limit.

**Responsibilities:**
- Render track and fill
- Animate fill width
- Change color based on percentage
- Show current value and max

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | `0` | Current value (required) |
| `max` | `number` | `100` | Maximum value |
| `label` | `string` | — | Accessible label |
| `showValue` | `boolean` | `false` | Show value text below bar |

**States:**

| State | Fill Color | Trigger |
|---|---|---|
| Safe | `--badge-green` | value / max < 0.7 |
| Warning | `--badge-orange` | value / max >= 0.7 && value / max < 1.0 |
| Over | `--badge-red` | value / max >= 1.0 |

**Accessibility:**
- `role="progressbar"` on container
- `aria-valuenow` set to current value
- `aria-valuemin` set to 0
- `aria-valuemax` set to max
- `aria-label` or `aria-labelledby` for description
- Color change is supplemented by text (not color-only)

**Keyboard Interactions:**
- Not focusable (decorative element)
- No keyboard interaction

**Animations:**
- Width: 300ms ease-out
- Color: 150ms ease-out

**Composition Rules:**
- Full width of container
- 6px height, pill-shaped
- Used for tab budget visualization

**Usage Example:**
```javascript
ProgressBar({ value: 7, max: 10, label: 'Tab budget', showValue: true })
```

---

### Spinner

**Purpose:** Indicate loading state.

**Responsibilities:**
- Render animated spinner
- Support size variants
- Announce loading state to screen readers

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `'small' \| 'default'` | `'default'` | Spinner size |
| `label` | `string` | `'Loading...'` | Accessible label |

**Sizes:**

| Size | Dimensions |
|---|---|
| `small` | 16x16px |
| `default` | 24x24px |

**Accessibility:**
- `role="status"` on spinner
- `aria-label` for screen readers
- Visually hidden text "Loading..." available

**Keyboard Interactions:**
- Not focusable
- No keyboard interaction

**Animations:**
- Rotation: 600ms linear infinite

**Composition Rules:**
- Used inside buttons during loading state
- Used in loading states
- No text beside spinner (optional, but not required)

**Usage Example:**
```javascript
Spinner({ size: 'small', label: 'Saving...' })
```

---

### Divider

**Purpose:** Visually separate content sections.

**Responsibilities:**
- Render horizontal line
- Support spacing variants

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `spacing` | `'none' \| 'small' \| 'default'` | `'default'` | Vertical spacing |

**Spacing:**

| Spacing | Margin |
|---|---|
| `none` | 0 |
| `small` | `--space-2` (8px) |
| `default` | `--space-4` (16px) |

**Accessibility:**
- `role="separator"` on divider
- `aria-orientation="horizontal"`
- Visually distinct from background

**Composition Rules:**
- Full width
- 1px height
- `--border-default` color

**Usage Example:**
```javascript
Divider()
Divider({ spacing: 'small' })
```

---

## Layout Components

---

### AppShell

**Purpose:** Root container for the popup.

**Responsibilities:**
- Set popup dimensions (340px width)
- Handle overflow scrolling
- Render background color
- Contain screen router

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Node` | — | Current screen |
| `activeScreen` | `'dashboard' \| 'sites' \| 'settings'` | — | Active screen name |

**Accessibility:**
- `role="main"` on container
- `aria-label="Boomrng popup"`

**Composition Rules:**
- Full width (340px)
- Max height: 580px
- Overflow: auto
- Background: `--surface-primary`

**Usage Example:**
```javascript
AppShell({
  activeScreen: 'dashboard',
  children: DashboardScreen()
})
```

---

### PageContainer

**Purpose:** Wrap individual screens with consistent padding and layout.

**Responsibilities:**
- Apply consistent padding
- Handle vertical scrolling
- Contain screen content

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `Node` | — | Screen content |
| `padding` | `'default' \| 'none'` | `'default'` | Apply padding |

**Composition Rules:**
- Padding: `--space-6` (24px) on all sides
- Min-height: 400px
- Flex column layout

**Usage Example:**
```javascript
PageContainer({ children: [
  Header({ title: 'Dashboard' }),
  ConstraintSummary(),
  TabBudget()
]})
```

---

### Header

**Purpose:** Display page title and optional actions.

**Responsibilities:**
- Render page title
- Show optional back button
- Show optional action button

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Page title (required) |
| `showBack` | `boolean` | `false` | Show back button |
| `onBack` | `() => void` | — | Back button handler |
| `action` | `Node` | — | Action button (e.g., "+ Add") |

**Accessibility:**
- Title uses `<h1>` element
- Back button has `aria-label="Go back"`
- Action button has descriptive `aria-label`

**Composition Rules:**
- Title on left, action on right
- 24px bottom margin
- Title: `--text-heading` (16px, weight 600)

**Usage Example:**
```javascript
Header({ title: 'Sites', action: Button({ variant: 'ghost', children: '+ Add' }) })
```

---

### BottomNavigation

**Purpose:** Navigate between screens.

**Responsibilities:**
- Render three navigation items
- Highlight active screen
- Handle screen switching

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `activeScreen` | `'dashboard' \| 'sites' \| 'settings'` | — | Current screen |
| `onNavigate` | `(screen: string) => void` | — | Navigation handler |

**Accessibility:**
- `role="navigation"` on container
- `aria-label="Main navigation"`
- Active item has `aria-current="page"`
- Each item is a button with text label

**Keyboard Interactions:**
- `Arrow Left/Right` — Navigate between items
- `Enter` — Select item
- `Tab` — Move focus to/from navigation

**Composition Rules:**
- Fixed at bottom of popup
- Three items: Dashboard, Sites, Settings
- Active item: `--text-accent` color
- Inactive item: `--text-tertiary` color
- Border top: 1px `--border-default`

**Usage Example:**
```javascript
BottomNavigation({
  activeScreen: currentScreen,
  onNavigate: setScreen
})
```

---

### Section

**Purpose:** Group related content with a title.

**Responsibilities:**
- Render section title
- Contain section content
- Apply consistent spacing

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Section title |
| `children` | `Node` | — | Section content |
| `action` | `Node` | — | Action element (e.g., "Add" button) |

**Composition Rules:**
- Title: `--text-label` (12px, weight 500, `--text-secondary`)
- 16px margin below title
- 24px margin below section
- Action aligned right of title

**Usage Example:**
```javascript
Section({
  title: 'Active Constraints',
  action: Button({ variant: 'ghost', children: '+ Add' }),
  children: ConstraintList()
})
```

---

### Stack

**Purpose:** Arrange children vertically with consistent spacing.

**Responsibilities:**
- Render children in a column
- Apply consistent gap between children

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `gap` | `'small' \| 'default' \| 'large'` | `'default'` | Gap between children |
| `children` | `Node` | — | Stack children |

**Gaps:**

| Gap | Value |
|---|---|
| `small` | `--space-2` (8px) |
| `default` | `--space-4` (16px) |
| `large` | `--space-6` (24px) |

**Composition Rules:**
- Full width
- Flex column layout
- No wrapping

**Usage Example:**
```javascript
Stack({ gap: 'default', children: [
  Input({ label: 'Domain', placeholder: 'twitter.com' }),
  ConstraintBehaviorPicker(),
  Button({ variant: 'primary', children: 'Add Constraint' })
]})
```

---

### Grid

**Purpose:** Arrange children in a grid layout.

**Responsibilities:**
- Render children in columns
- Apply consistent gap

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `1 \| 2` | `1` | Number of columns |
| `gap` | `'small' \| 'default'` | `'default'` | Gap between children |
| `children` | `Node` | — | Grid children |

**Composition Rules:**
- Used for side-by-side layouts (rare in popup)
- Maximum 2 columns

**Usage Example:**
```javascript
Grid({ columns: 2, gap: 'small', children: [
  Input({ label: 'From', type: 'number' }),
  Input({ label: 'To', type: 'number' })
]})
```

---

## Dashboard Components

---

### ConstraintSummary

**Purpose:** Show count of active constraints.

**Responsibilities:**
- Display total active constraints
- Display constraints enforced today

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `activeCount` | `number` | `0` | Active constraints |
| `enforcedToday` | `number` | `0` | Constraints enforced today |

**Composition Rules:**
- Single line: "Active constraints: 3"
- Secondary text: "6 enforced today" (if > 0)
- `--text-body` size

**Usage Example:**
```javascript
ConstraintSummary({ activeCount: 3, enforcedToday: 6 })
```

---

### ConstraintList

**Purpose:** Display list of active constraints.

**Responsibilities:**
- Render list of ConstraintRow components
- Handle empty state

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `constraints` | `Array<Constraint>` | `[]` | List of constraints |
| `onEdit` | `(id: string) => void` | — | Edit handler |
| `onRemove` | `(id: string) => void` | — | Remove handler |

**Composition Rules:**
- Uses Stack with 'small' gap
- Shows EmptyState if no constraints
- Each item is a ConstraintRow

**Usage Example:**
```javascript
ConstraintList({
  constraints: activeConstraints,
  onEdit: editConstraint,
  onRemove: removeConstraint
})
```

---

### ConstraintRow

**Purpose:** Display a single constraint in a list.

**Responsibilities:**
- Show domain name
- Show behavior badge
- Show status (active, delayed, blocked)
- Show delay countdown if delayed
- Handle edit/remove actions

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `constraint` | `Constraint` | — | Constraint object |
| `onEdit` | `() => void` | — | Edit handler |
| `onRemove` | `() => void` | — | Remove handler |

**Composition Rules:**
- Domain in monospace
- Badge on right
- Delay countdown in secondary text
- Icon button for remove (×)

**Usage Example:**
```javascript
ConstraintRow({
  constraint: { domain: 'twitter.com', behavior: 'checkpoint', status: 'active' },
  onEdit: () => editConstraint('twitter.com'),
  onRemove: () => removeConstraint('twitter.com')
})
```

---

### TabBudget

**Purpose:** Visualize tab budget status.

**Responsibilities:**
- Show progress bar
- Show current tabs vs budget
- Show "tabs available" text

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentTabs` | `number` | `0` | Current tab count |
| `budget` | `number` | `0` | Tab budget (0 = no limit) |

**Composition Rules:**
- Label: "Tab budget"
- ProgressBar component
- Text: "7 of 10 used" or "3 tabs available"
- Color changes based on percentage

**Usage Example:**
```javascript
TabBudget({ currentTabs: 7, budget: 10 })
```

---

### StrictModeCard

**Purpose:** Toggle Strict Mode on/off.

**Responsibilities:**
- Show Strict Mode status
- Explain what Strict Mode does
- Handle toggle

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `isActive` | `boolean` | `false` | Current Strict Mode state |
| `onToggle` | `(active: boolean) => void` | — | Toggle handler |

**Composition Rules:**
- Card container
- Title: "Strict Mode"
- Description: "All delays become blocks. Overrides require PIN."
- Toggle on right

**Usage Example:**
```javascript
StrictModeCard({
  isActive: strictModeEnabled,
  onToggle: setStrictMode
})
```

---

### StatusBadge

**Purpose:** Show constraint status in dashboard.

**Responsibilities:**
- Display status with color
- Show delay countdown if applicable

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` | `'active' \| 'delayed' \| 'blocked' \| 'overridden'` | — | Status type |
| `delay` | `string` | — | Delay time remaining (if delayed) |

**Composition Rules:**
- Badge component with variant mapping
- Delay text: "delayed 45m" or "blocked"

**Usage Example:**
```javascript
StatusBadge({ status: 'delayed', delay: '45m' })
```

---

## Constraint Components

---

### ConstraintCard

**Purpose:** Display a constraint in the Sites screen.

**Responsibilities:**
- Show domain, behavior, status
- Handle edit/remove actions
- Show delay countdown if applicable

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `constraint` | `Constraint` | — | Constraint object |
| `onEdit` | `() => void` | — | Edit handler |
| `onRemove` | `() => void` | — | Remove handler |

**Composition Rules:**
- Card with interactive state
- Domain in monospace, large
- Behavior badge below domain
- Status badge on right
- Remove button (×) on far right

**Usage Example:**
```javascript
ConstraintCard({
  constraint: { domain: 'twitter.com', behavior: 'checkpoint', status: 'active' },
  onEdit: () => edit('twitter.com'),
  onRemove: () => remove('twitter.com')
})
```

---

### ConstraintEditor

**Purpose:** Form for creating/editing a constraint.

**Responsibilities:**
- Capture domain input
- Capture behavior selection
- Capture delay duration (if delay behavior)
- Capture schedule (if scheduled behavior)
- Capture custom message (if custom message behavior)
- Validate inputs

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `constraint` | `Constraint \| null` | `null` | Existing constraint (edit mode) |
| `onSave` | `(constraint: Constraint) => void` | — | Save handler |
| `onCancel` | `() => void` | — | Cancel handler |

**Composition Rules:**
- Stack layout
- Domain input (monospace)
- Behavior picker
- Conditional fields based on behavior
- Save/cancel buttons

**Usage Example:**
```javascript
ConstraintEditor({
  constraint: null,
  onSave: addConstraint,
  onCancel: closeModal
})
```

---

### ConstraintBehaviorPicker

**Purpose:** Select enforcement behavior for a constraint.

**Responsibilities:**
- Show 8 behavior options
- Show description for each
- Handle selection

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | `'checkpoint'` | Selected behavior |
| `onChange` | `(behavior: string) => void` | — | Selection handler |

**Variants:**

| Behavior | Description |
|---|---|
| `checkpoint` | Calm page, two buttons, conscious decision |
| `delay` | Site unavailable for set duration |
| `progressive-delay` | Escalating delays with each attempt |
| `scheduled` | Only constrained during specific hours |
| `pin-required` | Must enter PIN to access |
| `reflection` | Calm page for 5-10 seconds before loading |
| `hard-block` | Site completely inaccessible |
| `custom-message` | Show user-defined message before loading |

**Composition Rules:**
- Select component with 8 options
- Helper text shows description of selected behavior
- Default: checkpoint

**Usage Example:**
```javascript
ConstraintBehaviorPicker({
  value: selectedBehavior,
  onChange: setSelectedBehavior
})
```

---

### BehaviorBadge

**Purpose:** Display behavior type as a badge.

**Responsibilities:**
- Show behavior name
- Use appropriate color

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `behavior` | `string` | — | Behavior type |

**Composition Rules:**
- Badge component with behavior-specific variant
- Text: behavior name in title case

**Usage Example:**
```javascript
BehaviorBadge({ behavior: 'checkpoint' })
```

---

### ConstraintFilters

**Purpose:** Filter constraint list by status or behavior.

**Responsibilities:**
- Show filter options
- Handle filter changes
- Show active filter count

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `activeFilter` | `string` | `'all'` | Current filter |
| `onFilter` | `(filter: string) => void` | — | Filter handler |

**Composition Rules:**
- Horizontal list of filter buttons
- "All" is default
- Other filters: Active, Delayed, Blocked

**Usage Example:**
```javascript
ConstraintFilters({
  activeFilter: currentFilter,
  onFilter: setFilter
})
```

---

### AddConstraintModal

**Purpose:** Modal for adding a new constraint.

**Responsibilities:**
- Show ConstraintEditor in add mode
- Handle save and close
- Show validation errors

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | `false` | Show/hide modal |
| `onClose` | `() => void` | — | Close handler |
| `onSave` | `(constraint: Constraint) => void` | — | Save handler |

**Composition Rules:**
- Modal wrapper
- Title: "Add Constraint"
- Content: ConstraintEditor (add mode)
- Footer: Cancel + Add Constraint buttons

**Usage Example:**
```javascript
AddConstraintModal({
  isOpen: showAddModal,
  onClose: () => setShowAddModal(false),
  onSave: addConstraint
})
```

---

### EditConstraintModal

**Purpose:** Modal for editing an existing constraint.

**Responsibilities:**
- Show ConstraintEditor in edit mode
- Pre-fill with existing values
- Handle save and close

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | `false` | Show/hide modal |
| `constraint` | `Constraint \| null` | `null` | Constraint to edit |
| `onClose` | `() => void` | — | Close handler |
| `onSave` | `(constraint: Constraint) => void` | — | Save handler |

**Composition Rules:**
- Modal wrapper
- Title: "Edit Constraint"
- Content: ConstraintEditor (edit mode)
- Footer: Cancel + Apply buttons

**Usage Example:**
```javascript
EditConstraintModal({
  isOpen: showEditModal,
  constraint: editingConstraint,
  onClose: () => setShowEditModal(false),
  onSave: updateConstraint
})
```

---

## Enforcement Components

---

### CheckpointScreen

**Purpose:** Signature interaction. Shown when visiting a constrained site.

**Responsibilities:**
- Display domain name
- Display "This site is constrained." message
- Show "Return to work" button (primary)
- Show "Continue anyway" link (secondary)
- Handle both actions

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `domain` | `string` | — | Constrained domain |
| `onReturn` | `() => void` | — | Return to work handler |
| `onContinue` | `() => void` | — | Continue anyway handler |

**Composition Rules:**
- Full viewport height
- Centered content
- Domain in monospace, large
- Message below domain
- Primary button full-width
- Secondary as plain text below button

**Accessibility:**
- `role="dialog"` on container
- `aria-labelledby` points to domain
- Focus on "Return to work" button by default
- Escape key triggers "Return to work"

**Keyboard Interactions:**
- `Enter` — Activates focused button
- `Escape` — Triggers "Return to work"
- `Tab` — Cycles between buttons

**Usage Example:**
```javascript
CheckpointScreen({
  domain: 'twitter.com',
  onReturn: () => history.back(),
  onContinue: () => window.location.replace('https://twitter.com')
})
```

---

### DelayScreen

**Purpose:** Show delay countdown for a constrained site.

**Responsibilities:**
- Display domain name
- Display countdown timer
- Show "Return to work" button
- Update timer every second

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `domain` | `string` | — | Constrained domain |
| `remainingMs` | `number` | — | Remaining delay in milliseconds |
| `onReturn` | `() => void` | — | Return to work handler |

**Composition Rules:**
- Full viewport height
- Centered content
- Domain in monospace
- Large countdown timer (48px, monospace, warning color)
- "remaining" label below timer
- Primary button full-width

**Accessibility:**
- `role="timer"` on countdown
- `aria-live="polite"` for timer updates
- Focus on "Return to work" button

**Keyboard Interactions:**
- `Enter` — Activates "Return to work"
- `Escape` — Activates "Return to work"

**Usage Example:**
```javascript
DelayScreen({
  domain: 'twitter.com',
  remainingMs: 2700000,
  onReturn: () => history.back()
})
```

---

### PinScreen

**Purpose:** Require PIN to access a constrained site.

**Responsibilities:**
- Display domain name
- Show PIN input (4-6 digits)
- Validate PIN
- Handle submit and return

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `domain` | `string` | — | Constrained domain |
| `onSubmit` | `(pin: string) => void` | — | PIN submit handler |
| `onReturn` | `() => void` | — | Return to work handler |
| `error` | `string` | — | Error message |

**Composition Rules:**
- Full viewport height
- Centered content
- Domain in monospace
- "This site requires your PIN." message
- PIN input group (4-6 digits)
- Error message below PIN input
- Primary button full-width
- Secondary "Return to work" below

**Accessibility:**
- Focus on first PIN digit by default
- Auto-advance on digit input
- Auto-submit on last digit
- Error announced with `aria-live="assertive"`

**Keyboard Interactions:**
- `0-9` — Enter digit
- `Backspace` — Delete digit
- `Enter` — Submit (if all digits entered)
- `Escape` — Return to work

**Usage Example:**
```javascript
PinScreen({
  domain: 'twitter.com',
  onSubmit: validatePin,
  onReturn: () => history.back(),
  error: pinError
})
```

---

### HardBlockScreen

**Purpose:** Show when site is completely blocked.

**Responsibilities:**
- Display domain name
- Display "This site is blocked." message
- Show "Return to work" button

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `domain` | `string` | — | Constrained domain |
| `onReturn` | `() => void` | — | Return to work handler |

**Composition Rules:**
- Full viewport height
- Centered content
- Domain in monospace
- Message below domain
- Primary button full-width
- No "Continue" option

**Accessibility:**
- Focus on "Return to work" button
- Escape triggers "Return to work"

**Keyboard Interactions:**
- `Enter` — Activates "Return to work"
- `Escape` — Activates "Return to work"

**Usage Example:**
```javascript
HardBlockScreen({
  domain: 'tiktok.com',
  onReturn: () => history.back()
})
```

---

### TabBudgetScreen

**Purpose:** Show when tab budget is exceeded.

**Responsibilities:**
- Display current tabs vs budget
- List tabs that can be closed
- Show "Close oldest tabs" action
- Handle individual tab close

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentTabs` | `number` | — | Current tab count |
| `budget` | `number` | — | Tab budget |
| `tabs` | `Array<{ id: number, title: string, url: string }>` | — | List of tabs |
| `onCloseTab` | `(id: number) => void` | — | Close tab handler |
| `onCloseOldest` | `(count: number) => void` | — | Close oldest tabs handler |

**Composition Rules:**
- Full viewport height
- Centered content
- Title: "Tab budget exceeded"
- Stats: "You have X tabs open. Your budget is Y."
- Instruction: "Close Z tabs to continue."
- Tab list with close buttons
- "Close Z oldest tabs" primary button

**Accessibility:**
- Focus on first tab close button
- Enter closes tab
- Tab navigates between close buttons

**Keyboard Interactions:**
- `Tab` — Navigate between close buttons
- `Enter` — Close focused tab
- `Escape` — Close oldest tabs (primary action)

**Usage Example:**
```javascript
TabBudgetScreen({
  currentTabs: 13,
  budget: 10,
  tabs: openTabs,
  onCloseTab: closeTab,
  onCloseOldest: closeOldestTabs
})
```

---

## Settings Components

---

### SettingsGroup

**Purpose:** Group related settings.

**Responsibilities:**
- Render group title
- Contain settings rows
- Apply consistent spacing

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Group title |
| `children` | `Node` | — | Settings rows |

**Composition Rules:**
- Title: `--text-label` (12px, weight 500)
- 16px margin below title
- Card container for group content
- 24px margin between groups

**Usage Example:**
```javascript
SettingsGroup({ title: 'PIN Protection', children: [
  SettingsRow({ label: 'Set PIN', action: Button({ children: 'Set' }) })
]})
```

---

### SettingsRow

**Purpose:** Display a single setting.

**Responsibilities:**
- Show label
- Show optional description
- Show action element (toggle, button, etc.)

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Setting label |
| `description` | `string` | — | Optional description |
| `action` | `Node` | — | Action element |

**Composition Rules:**
- Label on left, action on right
- Description below label (if provided)
- 12px padding vertical

**Usage Example:**
```javascript
SettingsRow({
  label: 'Tab Budget',
  description: 'Maximum number of tabs',
  action: NumberInput({ value: 10, onChange: setBudget })
})
```

---

### Toggle

**Purpose:** Toggle a setting on/off.

**Responsibilities:**
- Render toggle switch
- Handle toggle changes
- Show on/off state

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | `false` | Current state |
| `onChange` | `(checked: boolean) => void` | — | Toggle handler |
| `disabled` | `boolean` | `false` | Prevent interaction |
| `label` | `string` | — | Accessible label |

**States:**

| State | Visual Change |
|---|---|
| Off | Gray track, circle left |
| On | Green track, circle right |
| Disabled | 0.5 opacity |

**Accessibility:**
- `role="switch"` on toggle
- `aria-checked` reflects state
- `aria-label` for screen readers
- Keyboard: Space to toggle

**Keyboard Interactions:**
- `Space` — Toggles state
- `Tab` — Moves focus to/from toggle

**Animations:**
- Circle slides: 150ms ease-out
- Track color: 150ms ease-out

**Usage Example:**
```javascript
Toggle({ checked: isActive, onChange: setActive, label: 'Strict Mode' })
```

---

### NumberInput

**Purpose:** Capture numeric input.

**Responsibilities:**
- Render number input
- Handle increment/decrement
- Validate numeric input

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | `0` | Current value |
| `min` | `number` | — | Minimum value |
| `max` | `number` | — | Maximum value |
| `step` | `number` | `1` | Increment step |
| `onChange` | `(value: number) => void` | — | Change handler |

**Composition Rules:**
- Input component with `type="number"`
- Optional increment/decrement buttons

**Usage Example:**
```javascript
NumberInput({ value: budget, min: 1, onChange: setBudget })
```

---

### PinSetup

**Purpose:** Set or change PIN.

**Responsibilities:**
- Capture PIN input (4-6 digits)
- Capture PIN confirmation
- Validate PIN match
- Handle save

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `onSave` | `(pin: string) => void` | — | Save handler |
| `onCancel` | `() => void` | — | Cancel handler |

**Composition Rules:**
- Modal wrapper
- Title: "Set PIN" or "Change PIN"
- Two PIN inputs (entry + confirmation)
- Error message if mismatch
- Save + Cancel buttons

**Usage Example:**
```javascript
PinSetup({
  onSave: savePin,
  onCancel: closePinSetup
})
```

---

### ImportExport

**Purpose:** Import/export constraint configuration.

**Responsibilities:**
- Export constraints as JSON file
- Import constraints from JSON file
- Validate imported data

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `constraints` | `Array<Constraint>` | `[]` | Current constraints |
| `onImport` | `(constraints: Array<Constraint>) => void` | — | Import handler |

**Composition Rules:**
- SettingsGroup wrapper
- Export button triggers download
- Import button triggers file picker
- Validation error shown if invalid

**Usage Example:**
```javascript
ImportExport({
  constraints: allConstraints,
  onImport: importConstraints
})
```

---

## Feedback Components

---

### EmptyState

**Purpose:** Display when a section has no content.

**Responsibilities:**
- Show title
- Show description (optional)
- Show action button (optional)

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Empty state title |
| `description` | `string` | — | Optional description |
| `action` | `Node` | — | Optional action button |

**Composition Rules:**
- Centered content
- Title: `--text-body` (14px, weight 500)
- Description: `--text-label` (12px, `--text-tertiary`)
- Action: Ghost button
- 48px padding vertical

**Usage Example:**
```javascript
EmptyState({
  title: 'No constraints yet',
  description: 'Add your first constraint to get started.',
  action: Button({ variant: 'ghost', children: '+ Add Constraint' })
})
```

---

### LoadingState

**Purpose:** Display during data loading.

**Responsibilities:**
- Show spinner
- Show optional message

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | `'Loading...'` | Loading message |

**Composition Rules:**
- Centered content
- Spinner component
- Message below spinner (optional)
- 48px padding vertical

**Usage Example:**
```javascript
LoadingState({ message: 'Loading constraints...' })
```

---

### ErrorState

**Purpose:** Display when an error occurs.

**Responsibilities:**
- Show error message
- Show retry button (optional)

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | — | Error message |
| `onRetry` | `() => void` | — | Retry handler |

**Composition Rules:**
- Centered content
- Error message in `--color-error`
- Retry button (ghost variant)
- 48px padding vertical

**Usage Example:**
```javascript
ErrorState({
  message: 'Failed to load constraints.',
  onRetry: loadConstraints
})
```

---

### ConfirmationDialog

**Purpose:** Confirm destructive actions.

**Responsibilities:**
- Show confirmation message
- Show confirm/cancel buttons
- Handle both actions

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | `false` | Show/hide dialog |
| `title` | `string` | — | Dialog title |
| `message` | `string` | — | Confirmation message |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button label |
| `onConfirm` | `() => void` | — | Confirm handler |
| `onCancel` | `() => void` | — | Cancel handler |
| `variant` | `'danger' \| 'default'` | `'default'` | Confirm button variant |

**Composition Rules:**
- Modal wrapper
- Title + message
- Footer: Cancel + Confirm buttons
- Confirm button uses danger variant for destructive actions

**Usage Example:**
```javascript
ConfirmationDialog({
  isOpen: showDeleteConfirm,
  title: 'Remove Constraint',
  message: 'Are you sure you want to remove this constraint?',
  confirmLabel: 'Remove',
  onConfirm: confirmRemove,
  onCancel: () => setShowDeleteConfirm(false),
  variant: 'danger'
})
```

---

## Screen Compositions

### Dashboard Screen

```
Dashboard
├── AppShell
│   ├── PageContainer
│   │   ├── Header(title: "boomrng")
│   │   ├── ConstraintSummary
│   │   ├── ConstraintList
│   │   │   ├── ConstraintRow (× N)
│   │   │   └── EmptyState (if no constraints)
│   │   ├── TabBudget
│   │   └── StrictModeCard
│   └── BottomNavigation(active: "dashboard")
```

**State Requirements:**
- `constraints: Array<Constraint>` — Active constraints
- `tabCount: number` — Current tab count
- `tabBudget: number` — Tab budget setting
- `strictMode: boolean` — Strict Mode state
- `enforcedToday: number` — Constraints enforced today

---

### Sites Screen

```
Sites
├── AppShell
│   ├── PageContainer
│   │   ├── Header(title: "Sites", action: "+ Add")
│   │   ├── ConstraintFilters
│   │   ├── Stack
│   │   │   ├── ConstraintCard (× N)
│   │   │   └── EmptyState (if no constraints)
│   │   └── Section(title: "Always Allowed")
│   │       ├── Stack
│   │       │   ├── AllowedSiteRow (× N)
│   │       │   └── EmptyState (if no allowed sites)
│   │       └── Button(variant: "ghost", children: "+ Add")
│   ├── BottomNavigation(active: "sites")
│   ├── AddConstraintModal
│   └── EditConstraintModal
```

**State Requirements:**
- `constraints: Array<Constraint>` — All constraints
- `allowedSites: Array<string>` — Always Allowed sites
- `activeFilter: string` — Current filter
- `showAddModal: boolean` — Add modal visibility
- `showEditModal: boolean` — Edit modal visibility
- `editingConstraint: Constraint | null` — Constraint being edited

---

### Settings Screen

```
Settings
├── AppShell
│   ├── PageContainer
│   │   ├── Header(title: "Settings")
│   │   ├── SettingsGroup(title: "PIN Protection")
│   │   │   └── SettingsRow(label: "Set PIN", action: Button)
│   │   ├── SettingsGroup(title: "Intentional Overrides")
│   │   │   ├── SettingsRow(label: "Max per day", action: NumberInput)
│   │   │   └── SettingsRow(label: "Require PIN after", action: NumberInput)
│   │   ├── SettingsGroup(title: "Tab Budget")
│   │   │   └── SettingsRow(label: "Maximum tabs", action: NumberInput)
│   │   ├── SettingsGroup(title: "Landing Page")
│   │   │   └── SettingsRow(label: "Redirect URL", action: Input)
│   │   ├── ImportExport
│   │   ├── SettingsGroup(title: "About")
│   │   │   └── SettingsRow(label: "boomrng v2.0")
│   │   └── BottomNavigation(active: "settings")
│   └── PinSetup(modal)
```

**State Requirements:**
- `pin: string | null` — Current PIN
- `maxOverridesPerDay: number` — Override limit
- `requirePinAfter: number` — PIN threshold
- `tabBudget: number` — Tab budget
- `landingPage: string` — Redirect URL
- `showPinSetup: boolean` — PIN setup modal visibility

---

### Enforcement Pages

These are full-page screens, not popup screens. They replace the current tab's content.

**Checkpoint Page:**
```
checkpoint.html
└── CheckpointScreen
    ├── domain (from URL params)
    ├── onReturn (history.back or close tab)
    └── onContinue (navigate to original URL)
```

**Delay Page:**
```
delay.html
└── DelayScreen
    ├── domain (from URL params)
    ├── remainingMs (from storage)
    └── onReturn (history.back)
```

**PIN Page:**
```
pin.html
└── PinScreen
    ├── domain (from URL params)
    ├── onSubmit (validate PIN)
    ├── onReturn (history.back)
    └── error (validation error)
```

**Hard Block Page:**
```
hardblock.html
└── HardBlockScreen
    ├── domain (from URL params)
    └── onReturn (history.back)
```

**Tab Budget Page:**
```
tabbudget.html
└── TabBudgetScreen
    ├── currentTabs (from chrome.tabs)
    ├── budget (from storage)
    ├── tabs (from chrome.tabs)
    ├── onCloseTab (chrome.tabs.remove)
    └── onCloseOldest (chrome.tabs.remove)
```

---

## Shared Types

```javascript
// Constraint object
{
  id: string,                    // Unique identifier
  domain: string,                // Normalized domain (e.g., "twitter.com")
  behavior: string,              // One of 8 behavior types
  delayMinutes: number | null,   // Delay duration (if delay or progressive-delay)
  schedule: {                    // Schedule config (if scheduled)
    from: string,                // Start time (e.g., "09:00")
    to: string,                  // End time (e.g., "17:00")
    days: number[]               // Days of week (0-6, Sunday-Saturday)
  } | null,
  customMessage: string | null,  // Custom message (if custom-message)
  createdAt: number,             // Timestamp
  enforcedCount: number,         // Times enforced today
  lastEnforcedAt: number | null  // Last enforcement timestamp
}

// Settings object
{
  pin: string | null,
  maxOverridesPerDay: number,
  requirePinAfter: number,
  tabBudget: number,
  landingPage: string,
  allowedSites: string[],
  strictMode: boolean
}
```

---

## Component Decision Guide

| Question | Use |
|---|---|
| Need a button? | Button |
| Need to capture text? | Input |
| Need to select from list? | Select |
| Need to show modal? | Modal |
| Need to show notification? | Toast |
| Need to group content? | Card |
| Need to show status? | Badge |
| Need to show progress? | ProgressBar |
| Need to show loading? | Spinner |
| Need to separate sections? | Divider |
| Need page layout? | PageContainer |
| Need header? | Header |
| Need navigation? | BottomNavigation |
| Need section with title? | Section |
| Need vertical spacing? | Stack |
| Need grid layout? | Grid |
| Need empty state? | EmptyState |
| Need error state? | ErrorState |
| Need confirmation? | ConfirmationDialog |

---

## Summary

This component architecture provides:

- **30+ components** organized into 7 layers
- **Complete specifications** for every component
- **Screen compositions** showing exactly which components compose each screen
- **Folder structure** for organized file management
- **Type definitions** for shared data structures
- **Decision guide** for choosing the right component

Every component is defined with purpose, props, variants, states, accessibility, keyboard interactions, animations, composition rules, and usage examples.

Implementation is now assembling components, not designing while coding.