# Boomrng V2 — Product & Visual Design Specification

> Source of truth for implementation. Supersedes the exploratory sections of `REDESIGN-PLAN.md`, `DESIGN-SYSTEM.md`, and `COMPONENT-ARCHITECTURE.md` wherever they conflict with this document. Builds directly on `BOOMRNG-V2-AUDIT.md`, but revises several of that document's own recommendations where a closer look changed the answer — those revisions are called out explicitly rather than silently overwritten.
>
> No code has been written or modified as part of this document. Everything below is a decision, not an implementation.

---

## 1. Refined Product Positioning

The audit's positioning — *"One honest pause between you and the site you're about to open"* — undersells the product once Delay, PIN, Hard Block, and Tab Budget are all working. It describes Checkpoint. Here are five broader directions, evaluated on their own terms.

### A. The Boundary
**Statement:** *"Boomrng is where you draw the boundaries around your own attention, and where you're held to them."*
**Tagline:** *"Boundaries you set. Kept by you."*
**Emphasizes:** self-authorship, the idea that every constraint is something the user chose, not something imposed.
**Weakness:** "boundary" leans slightly therapeutic/self-help in register — a mismatch with the "quietly opinionated," precise tone the brand wants.

### B. The Return
**Statement:** *"Boomrng notices when you've drifted from what you meant to do, and brings you back."*
**Tagline:** *"Get back to it."*
**Emphasizes:** the boomerang metaphor directly, the restorative rather than punitive framing, works equally well for Checkpoint, Delay, and Hard Block (all end in "returning").
**Weakness:** doesn't foreground the *mechanism* (friction, choice) — could be misread as a generic "focus" or productivity app if the tagline is seen in isolation.

### C. Friction, Chosen in Advance
**Statement:** *"Boomrng lets you decide, ahead of time, how much friction a site deserves — then holds that line when the moment actually arrives."*
**Tagline:** *"Decide once. Held every time."*
**Emphasizes:** the pre-commitment idea — you're not negotiating with yourself in the moment, you already decided.
**Weakness:** more cognitively "clever" than warm; reads more like a behavioral-economics pitch than a product line a user would repeat casually.

### D. The Honest Pause (audit's original, broadened)
**Statement:** *"Boomrng puts an honest pause between impulse and action, sized to the site — from a moment's thought to a closed door — and hands you back to what you were doing."*
**Tagline:** *"Pause, sized to the site."*
**Emphasizes:** the friction *spectrum* (Checkpoint → Delay → PIN → Hard Block) as the core idea, not just Checkpoint.
**Weakness:** "sized to the site" is a little abstract without seeing the product; needs the four-behavior picker on screen to land.

### E. Self-Imposed Constraint, Not Imposed Blocking
**Statement:** *"Boomrng isn't a blocker someone else set up for you. It's the constraint you set for yourself, enforced exactly when you're tempted to break it."*
**Tagline:** *"The rule you made for yourself."*
**Emphasizes:** differentiation from parental-control/enterprise blockers specifically — directly answers "why not just use a blocker."
**Weakness:** defines itself against a category ("not a blocker") rather than standing on its own; works better as internal brand rationale than as the tagline itself.

### Recommendation

**Direction B (The Return), refined with a line from D**, as the working positioning:

> **"Boomrng notices when you've drifted from what you meant to do, and — with exactly as much friction as you asked for — brings you back."**
> **Tagline: "Get back to it."**

This keeps the emotional core (restoration, not punishment) as the headline, folds in the friction-spectrum idea as the mechanism rather than the pitch, and stays short enough to survive being the actual `manifest.json` description and Chrome Web Store one-liner. "Get back to it" also reads correctly on every enforcement page — Checkpoint, Delay, and Hard Block all end at the same place.

---

## 2. Product Personality → Design Decisions

| Attribute | Visual hierarchy | Spacing | Typography | Color | Motion | Icons | Copy | Interaction |
|---|---|---|---|---|---|---|---|---|
| **Calm** | One clear focal point per screen; nothing competes for attention | Generous, consistent gaps (§7); never cramped | Regular weights by default; bold reserved for one thing per screen | Accent color appears once per screen, not scattered | Nothing loops except a spinner; nothing pulses for attention | No badges/dots demanding notice unless truly actionable | Short sentences, periods not exclamation points | No pop-ups the user didn't trigger |
| **Intentional** | Primary action is always the one action that serves the user's stated intent | — | — | Accent color is *reserved* for the action that returns you to intent, never wasted on decoration | — | — | Copy names the *consequence* of an action before the action happens (previews, not surprises) | Defaults are chosen deliberately (Checkpoint, not Hard Block) |
| **Modern** | Flat surfaces over heavy skeuomorphism | Tight, precise 4px-grid spacing, not loose/airy | System font stack, no custom webfont weight loaded | Dark, desaturated-but-legible palette, not glossy gradients | Short (120–200ms), physical-feeling transitions | Thin single-weight stroke icons, no drop shadows on icons | No jargon, no "leverage/utilize" | Keyboard-operable everywhere, not just mouse-first |
| **Quietly opinionated** | Recommended option (Checkpoint) is visually first and pre-selected, not alphabetical | — | — | — | — | — | States a recommendation, doesn't hedge ("Checkpoint is a good default for most sites") | Fewer settings, not a settings-for-everything approach |
| **Personal** | The optional "reason" text a user writes appears verbatim on the enforcement page — the product surfaces the user's own words back to them | — | The user's own reason renders in body weight, quoted, distinct from system copy | — | — | — | First person / second person ("you," not "the user") | Reason field is genuinely optional, never required |
| **Privacy-conscious** | No dashboards of tracked behavior anywhere in the UI | — | — | — | — | — | Settings/About explicitly states "stored on this device only" in plain language, not buried in a policy link | No feature ever requires a network request to function |
| **Focused** | Max one primary button per screen | Screens don't scroll unless genuinely necessary | Max 3 type sizes visible on any one screen | — | — | — | — | Every screen has exactly one obvious next action |

**What these attributes explicitly rule out** (mapped to the "should NOT feel like" list):
- **Parental** → no lock icons on every row, no "restricted"/"forbidden" vocabulary, no visual metaphor of a cage or gate with bars.
- **Punitive** → no red full-bleed screens, no countdown styled like a bomb timer, no "you failed" states.
- **Corporate** → no dense settings tables, no "Enterprise," no multi-tier plan language anywhere (there's only one tier).
- **Gamified** → no streaks, scores, badges, or percentages-completed anywhere, ever.
- **Preachy** → no rhetorical questions like "was it worth it?", no third-party judgment of the user's choices.
- **Productivity-bro** → no "crush your goals," no fire emoji, no bold all-caps motivational copy.
- **Overly playful** → no bouncy easing curves, no mascot, no illustrated empty states with cartoon characters.

---

## 3. Visual Identity — The Motif

**Chosen motif: the open arc.** A single curved stroke — not a closed circle, not a literal boomerang — that reads as *a path that bends back toward its start*. It is the one shape used deliberately across the product wherever the idea of "leaving and returning" is present.

**Where it appears, concretely:**

1. **Delay's progress indicator** is a radial arc that *closes* as time elapses — visually, the open path is literally shrinking back toward whole. This is the motif's most functional appearance, not just decorative (§13).
2. **The "back to what I was doing" action** — on Checkpoint, Delay, and Hard Block — uses a small arc-with-return-hook glyph next to the label, consistently, so the eye learns to associate that one shape with "this brings me back."
3. **The extension icon** (§4) is built from the same open-arc primitive at product-mark scale.
4. **Loading spinners** are a partial arc (270° sweep) rather than a full circle — subtle, but consistent with the rest of the system, and slightly faster to read as "in progress" than a full ring.
5. **The active-tab indicator in bottom navigation** is a short arc/underline beneath the active label rather than a filled pill — a quieter nod to the same geometry, not a duplicate of the loud version used elsewhere.

**What is explicitly excluded:** no literal boomerang silhouettes, no throwing/spinning/flying animations, no "whoosh" motion effects, no boomerang-shaped buttons or containers. The metaphor lives in *one primitive shape and its behavior* (open → closing → closed), reused quietly, not in illustration.

---

## 4. Logo / Extension Icon Direction — **DECIDED: Concept 1, Smooth Arc**

> **Status update:** after reviewing all three concepts rendered together at 16/32/48/128px in the visual prototype, **Concept 1 (Smooth Arc) is locked as the V2 Return Arc mark.** Concepts 2 (Notch Ring) and 3 (Bent Mark) are retired from further consideration — kept in the prototype's brand board only as a record of what was explored, not as live options. Every use of the mark going forward (toolbar icon, popup header, favicon-sized instances, this document's own diagrams) uses the Smooth Arc exclusively. The concept write-ups below are kept for the record of *why* it was chosen over the alternatives, not as an open comparison.

The existing assets (`images/icon-{16,48,128}.png`, `images/boomrng-icon.svg`) were not evaluated pixel-by-pixel here (icon design needs visual iteration, not prose) — but any V2 icon must satisfy one hard constraint the current toolbar-icon size (16×16, the size actually seen most often) makes brutal: **it must read as a single, unambiguous shape at 16px**, not a composition.

### Concept 1 — The Return Arc (chosen for V2)
A single bold, continuous curved stroke — like a boomerang reduced to its essential gesture, one thick arc with slightly tapered ends — rendered in accent green on a dark rounded-square field. No secondary elements, no dot, no second stroke. At 16px it reads as a simple check-adjacent curve; at 128px the taper and stroke-weight variation become visible as a deliberate, crafted mark rather than a clip-art curve.
*Why it wins:* one shape, one weight, scales cleanly, and is the most literal expression of the chosen motif (§3) without being a literal boomerang.

### Concept 2 — The Notch Ring (retired)
A circle with a single gap (like a "C" rotated 90°, or a progress ring frozen mid-way) — evokes both "checkpoint" (a ring you pass through) and "not yet closed" (open path). At 128px it could optionally carry a slightly heavier stroke on one end to suggest directionality.
*Trade-off:* reads slightly more like a generic "loading" or "settings" glyph out of context; less ownable than Concept 1.

### Concept 3 — The Bent Mark (retired)
An abstract angular mark — two strokes meeting at roughly 120°, like a sharply bent line rather than a smooth arc — suggesting a path that's been redirected. More geometric/technical in feeling than Concept 1's smooth curve.
*Trade-off:* reads colder/more corporate; works against the "personal, calm" brand attributes more than it works for them.

### Decision
**Concept 1 (The Return Arc) — final.** It's the only one of the three that is both (a) legible as a single shape at 16px and (b) a direct, literal expression of the "leave → return" idea without needing explanation. Render the wordmark ("boomrng," lowercase, no period, existing convention) in a plain system-adjacent sans-serif at normal weight next to the mark for any surface wider than the icon alone (Chrome Web Store listing, popup header at §8) — never inside the icon itself, and never stretched or distorted from the icon's native square proportions.

**Favicon-sized representation (used inside the popup header, §8):** the same arc mark at ~16–18px, monochrome (accent green only, no gradient), no wordmark alongside it at that size — the wordmark text sits to its right in the header row instead of being baked into the mark.

Final pixel-level artwork is out of scope for this document — this section fixes the *direction* so that whoever produces the actual SVG (this may be the developer, iterating by eye) has one clear brief to work from, not three competing options to guess between.

---

## 5. Final V2 Color System

Refines, does not replace, the audit's §4 direction — the accent hue family is preserved; several token values are adjusted for contrast, and the *usage rule* (where green is banned) is new and load-bearing.

| Token | Hex | Role |
|---|---|---|
| `--canvas` | `#0A2119` | Page background — popup body, enforcement page background |
| `--surface` | `#102A21` | Elevated chrome: header row, bottom nav, modal/panel background |
| `--card` | `#14332A` | Bounded summary containers (Tab Budget card, Settings section groups) — used sparingly, see §7 |
| `--surface-subtle` | `#0D251E` | Inset elements: disabled inputs, quiet backgrounds behind grouped list rows |
| `--border` | `#1E3A30` | Default hairline borders, row dividers |
| `--border-strong` | `#2C5244` | Hover state borders, dividers that need more visual weight (e.g. section separators) |
| `--text-primary` | `#EEF5F1` | Headings, primary body copy, domain text |
| `--text-secondary` | `#9EB3AA` | Supporting copy, descriptions, inactive nav labels |
| `--text-muted` | `#6C8179` | Placeholders, metadata, timestamps, disabled text |
| `--accent` | `#2BBE6E` | Brand accent — see usage rule below |
| `--accent-hover` | `#3ED17F` | Hover/active state of accent-colored elements |
| `--text-on-accent` | `#062318` | Text/icon color placed on top of `--accent` fills (near-black, not white — see contrast note) |
| `--focus-ring` | `#2BBE6E` at 55% opacity, 2px, 2px offset | Keyboard focus indicator, all interactive elements |
| `--success` | `#2BBE6E` | Same value as accent — "on track" and "brand" are treated as one meaning, not two competing greens |
| `--warning` | `#E3A53D` | Approaching tab budget, delay in progress |
| `--destructive` | `#E0555A` | Delete confirmation, over tab budget, invalid input |
| `--info` | `#4F9CDB` | PIN-required status badge only — a deliberately cool, non-green, non-alarming signal |

**Contrast note:** `--accent` (`#2BBE6E`) is light enough that white text fails to meet 4.5:1 against it reliably. Every filled accent button uses `--text-on-accent` (`#062318`, near-black) for its label, not white — verified to exceed 7:1 against `#2BBE6E`.

### Where green should not be used

This is the operative rule, not decoration: **`--accent` appears at most once as a filled background per screen**, and only on the single action that most directly returns the user to their stated intent (the primary button on Checkpoint/Delay/Hard Block; "Add Constraint" on Sites; "Save" in the creation flow). Everywhere else, green is used only as:
- a thin indicator (underline, dot, ring fill) — never a second competing filled button on the same screen;
- text color for links/labels that are informational, not actions.

**Explicitly green-free surfaces:**
- **Hard Block.** No green anywhere on this page. It should feel neutral and final, not "friendly" — using the brand accent here would visually soften a screen whose entire job is firmness. Hard Block uses `--text-primary`/`--text-secondary` and a muted icon only.
- **Disabled/inactive states.** Never tinted green-at-low-opacity to indicate "off but branded" — use `--text-muted`/`--surface-subtle` instead. A disabled control that's still green reads as broken, not calm.
- **Non-interactive status text** that isn't the specific "you're within budget / this is active" signal (e.g., general body copy, metadata) — those use `--text-secondary`, not accent, even when the sentiment is positive.
- **Bottom navigation at rest.** Inactive tabs use `--text-secondary`; only the active tab's underline (§3) and label use accent — never a filled background pill.

This is the direct fix for the "popup and enforcement pages feel like different products" problem identified in the audit: both surfaces import the same token file, and both follow the same one-accent-per-screen rule, so a user moving from the popup to an enforcement page and back sees the identical restrained use of color rather than two independently-tuned green palettes.

---

## 6. Typography System

**Family:** system stack throughout — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`. No web font is loaded; there is no meaningful identity gain from a custom typeface at this UI scale that offsets the bundle-size and render-flash cost, and every reference point in the brand's own inspiration list (Linear, Raycast, Arc) leans on system fonts for exactly this reason.

**Monospace:** `ui-monospace, "SF Mono", Menlo, Consolas, monospace` — used **only** for domains and the Delay timer readout.

*Why domains are monospace:* a domain is an identifier, not prose — monospace visually marks it as "a piece of data," makes it instantly scannable in a list of otherwise-proportional text, and is the one place in the UI where the existing enforcement pages already got this right (worth keeping, not redesigning).

*Why the timer is monospace:* tabular figures prevent the countdown from visually jittering in width as digits change (a proportional "1" is narrower than a "8"), which matters specifically because the readout updates every second. This is a functional decision, not a stylistic one.

| Role | Size / Line height | Weight | Letter spacing | Notes |
|---|---|---|---|---|
| Enforcement headline | 20px / 26px | 600 | 0 | Used only on Checkpoint/Delay/PIN/Hard Block — never in the popup |
| Page title (Dashboard/Sites/Settings) | 17px / 24px | 600 | 0 | One per screen |
| Section heading | 13px / 18px | 600 | 0 | Sentence case, never uppercase (uppercase reads as shouting/corporate) |
| Body | 14px / 20px | 400 | 0 | Default text |
| Secondary body | 13px / 18px | 400 | 0 | `--text-secondary` color, descriptions/subtext |
| Label | 12px / 16px | 500 | 0.01em | Form labels, badges |
| Button | 14px / 20px | 500 | 0 | Never bold (600 reserved for headings only) |
| Metadata | 11px / 16px | 400 | 0.01em | Timestamps, counts, "12 min ago"-style text |
| Domain | 14px / 20px | 500 | 0 | Monospace, `--text-primary` |
| Timer (Delay) | 28px / 34px | 600 | 0.02em | Monospace, tabular-nums; deliberately **not** 48px — see §13 for why the "giant digital clock" treatment is rejected |

Maximum three distinct sizes visible on any single screen at once (already stated as a personality rule in §2 — this is where it becomes a hard constraint on layout).

---

## 7. Spacing, Shape & Surface Language

**Spacing scale (4px base):** `4, 8, 12, 16, 20, 24, 32, 40, 48`.

- Popup horizontal margin: `16px`, applied once at the shell level (§8), not re-declared per screen.
- Section gap (between major page sections): `24px`.
- List row internal padding: `12px` vertical, `4px` horizontal (rows are flush to the shell margin, not further indented).
- Card padding (the few true cards that remain): `16px`.
- Input height: `36px`.
- Button height: `36px` default, `40px` for the single full-width primary action on enforcement pages. **The `36px` default is compact/auto-width, not full-width** — this is the size for a panel or modal's primary action (e.g. "Add constraint," "Save changes," §11); only an enforcement page's single dominant action earns the larger full-bleed `40px` treatment.

**Radii — revised after seeing the first prototype pass:** the original `6px` figure below was applied to buttons as well as inputs, and once rendered it read as too rigid/boxy for primary actions specifically. Buttons now get their own step in the scale, sitting between inputs and containers rather than sharing the input value:

- `6px` — inputs, chips, badges (unchanged; these are dense, data-adjacent controls and stay tight).
- `9px` — **all buttons** (primary, secondary, ghost, the popup's "+ Add," empty-state CTAs, enforcement actions). New token: `--radius-control`.
- `10px` — modals, the slide-in creation panel, Dashboard's Tab Budget card (unchanged).

No radius larger than `10px` anywhere, and no pill-shaped (fully rounded) controls — the correction is "less rigid," not "soft." The audit's original doc proposed up to `16-20px` "large" radii for modals — still rejected: heavy rounding reads as soft/consumer-friendly in a way that undercuts "quietly opinionated." `9px` buttons against `6px` inputs and `10px` containers is a deliberate, visible progression rather than one flat value repeated everywhere.

**Ghost over outlined-rectangle for de-emphasized secondary actions — and, where the action is just "dismiss," no button at all.** The first prototype pass put every secondary action — including "Cancel" in the creation flow and "Back to what I was doing" wherever it wasn't the primary — inside a bordered rectangle identical in weight to `.btn-secondary`. Rendered, this competed visually with the primary action it was supposed to defer to. Revised, and revised again after the icon/text pass (§27):
- **Cancel in the creation flow is removed entirely**, not merely restyled — a header `×` close control does that job now (§11). `.btn-ghost` as a style still exists in the shared library and remains correct wherever a genuine secondary *action* (not just "close this") needs de-emphasis.
- **"Back to what I was doing" when it is the *secondary* action** (this only happens on the PIN page, where "Verify PIN" is primary): drops the bordered box entirely and becomes the same plain text link already used for Checkpoint's and Delay's secondary action, so all four enforcement pages share one visual grammar for "the quieter option" instead of PIN being the odd one out.
- Settings' "Change PIN" / "Clear PIN" and "Export" / "Import" stay as bordered `.btn-secondary` — these are peer utility actions, not a primary/secondary pair where one needs to visually defer to the other, so an outlined box is still the right weight there.

**Borders, not shadows, for resting state.** Every static surface (list rows, settings sections) is delineated with a `1px` `--border` hairline, never a drop shadow. Shadows are reserved *exclusively* for elements that are temporarily floating above content: the creation slide-panel, toasts, and the rare confirmation dialog. A shadow on a static, always-present element implies elevation that isn't real and adds visual noise for no informational gain.

**When something deserves a card vs. living directly on the page:**

| Give it a card when... | Let it live on the page when... |
|---|---|
| It's a **grouped configuration** the user edits together (a Settings section: PIN, Tab Budget) | It's a **single list item** among peers (a constraint row, a tab row) — use a flat row + hairline divider instead |
| It's a **standalone summary metric** meant to draw the eye once (Tab Budget on Dashboard) | It's **body copy or a status line** (e.g. "3 constraints active") — this is text, not a container |
| It's **temporarily floating** above other content (toast, panel, dialog) | It's a **persistent, always-visible primary structure** (the constraint list itself doesn't need an outer card if its rows already have dividers — wrapping a list of cards in another card is the specific pattern to avoid) |

This directly answers the request to avoid "every piece of information lives inside a container": the Sites list, the Dashboard constraint list, and the Tab Budget's tab list are all **flat rows inside one lightly-bordered region**, not a stack of individually-boxed cards. The only genuine cards in the entire product are: the Dashboard Tab Budget summary, and each section within Settings.

---

## 8. Popup Shell

- **Width:** `360px` (up from the current unstyled default) — enough room for domain + badge + actions on one row without truncation, still well within normal Chrome popup conventions.
- **Height:** minimum `420px`, grows with content up to `600px`, scrolls internally beyond that. Content-driven within that band — a screen renders at its own natural height, not a fixed box; raising the ceiling doesn't add space to screens that don't need it. `600px` (raised from an earlier `560px`) was chosen after measuring the real Add Constraint interactive states (Delay/PIN Required selected with the optional reason revealed) directly: at `560px` the tallest of those states clipped by up to 48px, a subtle scrollbar-only cue that undersold how close the content actually was to fitting. At `600px` that same state is reduced to an imperceptible 1–8px sliver, while every shorter screen (Dashboard, Settings, empty Sites, the default Add Constraint view) is completely unaffected, since none of them ever reached the old ceiling to begin with. `600px` was chosen over a taller `620px` specifically to stay inside Chrome's own conventional popup ceiling — historically observed around `600px` and not reliably documented beyond it — rather than risk Chrome silently clipping the popup itself.
- **Header (persistent across all three screens):** a single `40px` row — arc mark (§4) + "boomrng" wordmark, left-aligned; a small status dot, right-aligned (`--accent` filled = at least one constraint active, `--text-muted` outline = none yet). This row is the *entire* answer to "is Boomrng active" (§9's question 1) — it does not repeat on every screen as a redundant page title.
- **Bottom navigation:** kept — three items (Dashboard / Sites / Settings), text label + small icon, no change to the *pattern* the audit already validated. Restyled: active item gets a short accent-colored underline beneath its label (tying into the arc motif, §3) instead of a filled background pill; inactive items are `--text-secondary`.
- **Page transitions:** `140ms` crossfade + `4px` vertical settle, `ease-out`. Instant (opacity-only, no movement) under `prefers-reduced-motion`.
- **Safe spacing:** the `16px` horizontal margin is owned by the shell, not by individual screens — no screen should redeclare its own left/right padding.
- **Five-second understanding:** achieved by the header (status), the Dashboard's first line (what's active), and the Tab Budget card (capacity) all being visible without scrolling on first open — see §9 for the exact composition.
- **Focused sub-flows may hide both the header and the bottom navigation.** Add/Edit Constraint (§11) is the first case: neither the persistent header nor the three-screen navigation is relevant while filling out a single focused form, and hiding both reclaims their height rather than shrinking the content around them. A lightweight focused header (back arrow + title) replaces the persistent one for the duration. This is a shell-level capability, not a one-off exception — Presets (§29) reuses the identical mechanism.

---

## 9. Dashboard — Detailed Design

Answers, in order, top to bottom:

```
┌────────────────────────────────────┐
│ ⌒ boomrng                      ● │  ← header (shell-level, §8)
│                                    │
│ 5 constraints active               │  ← plain text, no container
│                                    │
│ ┌────────────────────────────────┐│
│ │ youtube.com      [Checkpoint]  ││  ← flat rows, one hairline
│ │ twitter.com [Delay · 15 min]   ││    border around the group —
│ │ reddit.com       [Hard Block]  ││    public constraints only
│ └────────────────────────────────┘│
│                                    │
│    View all                        │  ← quiet, appears whenever
│                                    │    anything is hidden
│ ┌────────────────────────────────┐│
│ │ Tab Budget                     ││  ← this IS a card (§7 rule)
│ │ ◔ 7 of 10                      ││    arc-shaped fill, motif tie-in
│ │ 3 tabs to spare                ││
│ └────────────────────────────────┘│
│                                    │
│ [◈ Dashboard] [◉ Sites] [⚙ Settings]│
└────────────────────────────────────┘
```

**Architecture correction — Dashboard is a preview, not a second management list.** The first version of this section let the constraint list grow unbounded (all normal constraints individually, private ones rolled into one extra row). Measured against the real component tree, that scaled badly: at only 5 constraints the list already pushed the Tab Budget card below the initial viewport, and it gets worse with every constraint added. Sites already is the management surface (§10) — Dashboard's job is a quick "what's true right now," not a duplicate list. The fix: **Dashboard renders at most 3 constraint rows, ever**, regardless of how many constraints exist.

**The privacy rule this revision corrects.** The original rolled-up "🔒 N private constraints" row was itself a leak: it told a casual viewer exactly how many constraints were private, which is precisely the information Private Constraint (§26) exists to withhold. The corrected rule: **private constraints influence only the headline count, and nothing else about them reaches the Dashboard DOM** — no row, no placeholder text, no "N private" figure, no icon, no `aria-label`, no `title`, no count-of-hidden-items anywhere. A casual viewer cannot tell, from the Dashboard alone, whether anything beyond the visible rows is private or simply additional public constraints past the 3-row cap — both cases render identically.

| Element | Content | Hierarchy | Component | Interaction | Empty state |
|---|---|---|---|---|---|
| Status dot | Filled/outline dot in header | Smallest, rightmost | `StatusDot` | None (display only) | Outline when zero constraints |
| Summary line | "N constraints active" — the real total, including private constraints; a bare count reveals nothing about which are private | Body, primary text color | plain text | None | "Nothing constrained yet." |
| Constraint list | Up to **3** public (`isPrivate === false`) constraints, oldest-first, as individual rows: domain (mono) + behavior badge + contextual state (delay duration only). Private constraints never appear here in any form — not as a row, a placeholder, or a count. If zero public constraints exist (all-private case), this block renders nothing at all rather than an empty box. | List rows | `ConstraintRow` (read-only) | Tap a row → opens Edit (§10/§11) | Whole block replaced by the page-level empty state below |
| View all | Quiet ghost-button link, no count in its label (never "View all 5") | Below the list, small | ghost `Button` | Navigates to Sites | Hidden entirely when nothing is hidden (total constraints ≤ rows shown) |
| Tab Budget card | "Tab Budget" label + arc/ring fill + "N of M" + one contextual line ("3 tabs to spare" / "Over by 2") | Section within one card | `ProgressArc` + text | Tap → Settings' Tab Budget field, optional | If `tabBudget` unset (0 = no limit), card shows "No tab budget set" + ghost "Set one" link |
| **Full-page empty state** (zero constraints) | Headline "Nothing constrained yet." / subhead "Add a site you want a pause before opening." / one accent button "Add your first constraint" | Replaces summary line + list entirely; Tab Budget card still shows if a budget is set | `EmptyState` | Button opens the creation flow (§11) directly from Dashboard | — |

**"View all" is keyed off the total vs. what's actually rendered — total constraints > rows shown — never off "are there more public constraints beyond 3."** That distinction matters: if the link only appeared when public constraints overflowed the cap, its mere presence or absence would tell a viewer whether the hidden remainder is private or just additional public constraints — exactly the signal §26 exists to prevent. Keying it off the total instead means the link behaves identically whether what's hidden is private, public-beyond-the-cap, or a mix.

**The all-private case is deliberately quiet, not explained.** A user with only private constraints (e.g. "3 constraints active" with zero eligible public rows) sees the summary line, no list block, and a "View all" link — nothing else. No placeholder copy invents an explanation ("Private sites", "Hidden constraints") for the empty space; inventing one would either leak that the constraints are private or be factually misleading if they aren't. This is distinct from the genuine zero-constraint empty state (§9's `EmptyState` row above), which only ever fires when the real total is zero.

**Explicitly excluded, per instruction:** no "N constraints enforced today" counter, no history, no charts, no streak, no comparison to yesterday. If `enforcedToday`-style data is ever wired up in a later phase, it does not belong on the Dashboard — the Dashboard answers "what's true right now," not "what happened."

---

## 10. Sites / Constraints — Detailed Design

**Label decision: keep "Sites."** "Constraints" is the correct *internal* vocabulary (used in copy: "Add a constraint," "3 constraints active") but as a nav label it's more abstract than what a user is actually thinking ("where do I add reddit.com" → they're thinking of a site, not a constraint object). Keeping "Sites" as the concrete, task-oriented label while using "constraint" in body copy is not an inconsistency — it's the same pattern as calling a nav item "Inbox" while the objects inside it are technically "messages."

**Populated state:**

```
┌────────────────────────────────────┐
│ Sites                         [+] │  ← icon-only, see below
│ ──────────────────────────────────│
│                                    │
│ ┌────────────────────────────────┐│
│ │ 🔒 3 private constraints hidden ││  ← reveal bar, see §26
│ │                        Unlock  ││
│ └────────────────────────────────┘│
│                                    │
│ ┌────────────────────────────────┐│
│ │ youtube.com                    ││
│ │ Checkpoint                 ✎ 🗑││
│ │────────────────────────────────││
│ │ reddit.com                     ││
│ │ Delay · 15 min              ✎ 🗑│
│ │ "I said I'd write, not scroll" ││  ← personal reason, if set,
│ │────────────────────────────────││    italic, muted, truncated
│ │ 🔒 Private site                ││  ← masked domain, real behavior
│ │ Hard Block                  ✎ 🗑│
│ │────────────────────────────────││
│ │ 🔒 Private site                ││
│ │ PIN Required                ✎ 🗑│
│ └────────────────────────────────┘│
│                                    │
│ [◈ Dashboard] [◉ Sites] [⚙ Settings]│
└────────────────────────────────────┘
```

**Empty state:** identical component and copy to the Dashboard's empty state (§9) — a centered `EmptyState` with **one** button, *"Add your first constraint"*. **The header's `+` icon button does not render in this state.** A screen with zero constraints showing both a labeled empty-state button and an icon-only header button is two ways to do the same thing on one screen, and the second one asks a brand-new user to decode an icon before they've even seen what the product does. Reachable independently of Dashboard, since a user might land on Sites first via muscle memory from V1.

**Add Constraint CTA — one control per state, never two:**

| State | Control | Label | Why |
|---|---|---|---|
| Empty | `EmptyState` primary button (centered) | "Add your first constraint" — full words, descriptive | A first-time user needs the *words*, not an icon, to understand what the button does before they've seen the product do anything |
| Populated | `IconButton`, top-right of the header row | icon only (`+`), no visible text | Once at least one constraint exists, the user already knows what "Sites" and "adding one" mean — the icon is now saving space, not hiding meaning (§27) |

The populated-state `+` is a compact `IconButton` (§24), not a text-plus-icon `Button`:
- `aria-label="Add constraint"` (required — this is the button's only accessible name)
- a native tooltip on hover/focus (`title="Add constraint"` at minimum; a richer tooltip component if one already exists in the shared library, but a native title is sufficient and shouldn't be skipped for want of something fancier)
- built from the shared `IconButton` component, not a one-off button — this is exactly the kind of control that component exists for
- a click/touch target of at least 32×32px even though the *visible* icon is smaller (§24's `IconButton` spec already sizes the hit area at 26×26 with padding; if usability testing on-device shows that's tight, grow the hit area via padding, not the icon itself)

**Do not add "+ Add constraint" text back into the populated header** unless real usability testing shows the bare icon is unclear — this is a deliberate, args-considered default, not an oversight to "fix" preemptively.

- **List:** flat rows in one bordered region (same row styling as Dashboard's preview list, §9, for visual consistency between the two places a constraint can appear — though Sites shows every constraint, not a capped preview). Unlike Dashboard, where a private constraint leaves no trace beyond the headline count, private constraints here **stay as individual rows** — Sites is where you manage each constraint, and its behavior + configuration (still visible even while masked) is usually enough to tell rows apart without needing the domain.
- **Row content:** domain (mono, primary line) → behavior label + relevant config on the same line where it fits ("Delay · 15 min") → optional personal-reason line (italic, `--text-muted`, single line, truncated with ellipsis) → edit/delete icon buttons, visible on hover/focus (not permanently rendered at full opacity, to keep the row visually light when idle). **For a private, still-locked row:** the domain line is replaced by a small lock glyph + "Private site" in the sans-serif italic (not monospace — it's a placeholder label, not real data, and monospace would falsely imply it's the actual identifier); the personal-reason line, if any, is also withheld while locked, for the same reason the domain is (§26). Once unlocked for the session, the row shows the real domain plus a small muted "Private" tag so it's still clear which constraints carry the flag.
- **Enabled/disabled per-row toggle:** **not included in V2 Core.** Adding a pause-this-one-constraint toggle multiplies state (4 behaviors × enabled/disabled × in-progress-delay) for a benefit that doesn't clearly outweigh the complexity — if a user wants a site unconstrained, they delete the constraint; re-adding it takes the same three taps as re-enabling would. Flagged as a **V2 Later** candidate only if real usage shows people re-adding the same domain repeatedly.
- **Editing:** tapping a row opens the same panel as Add, pre-filled (§11) — one flow, not two. **Exception:** editing a still-locked private constraint prompts for the PIN first (§26) — the edit panel never opens pre-filled with a domain the user hasn't unlocked.
- **Deletion:** the trash icon opens the existing `ConfirmationDialog` pattern (kept from the current implementation — it already works and doesn't need redesigning). Icon-only is appropriate here because a confirmation step already follows (§27). **Deletion is never gated by the private-constraint PIN**, locked or not — removing a constraint doesn't expose its domain, so requiring authentication first would only add friction with no privacy benefit.
- **Quick actions:** deliberately none beyond edit/delete. No "duplicate," no "pause," no context menu — resisting the sprawl that turned V1's Settings screen into an everything-drawer.

---

## 11. Constraint Creation — Redesigned Flow

**No `<select>`.** The behavior picker is a compact accordion, ordered by increasing friction: all four rows are visible at once as single collapsed lines, and **only the selected row expands** to show its description and (if any) configuration. This replaces the first version of this section, which specified four simultaneously-expanded cards — rendered in the actual 360px popup, that was too tall and too busy, closer to "a configuration dashboard" than the calm single choice this flow is supposed to be. The fix is the accordion, not a smaller version of the same four cards.

| # | Behavior | Icon concept | Collapsed row shows | Expanded (selected) row adds |
|---|---|---|---|---|
| 1 | **Checkpoint** *(default, pre-selected)* | Open arc + dot | Radio · icon · name · friction dots (●○○○) | "A quick pause before opening the site." |
| 2 | **Delay** | Closing arc/ring | Radio · icon · name · friction dots (●●○○) | "Wait for a time you choose before you can continue." + inline minutes stepper (1–120, default 15) |
| 3 | **PIN Required** | Minimal padlock | Radio · icon · name · friction dots (●●●○) | "Enter your Boomrng PIN before continuing." +, if no PIN is set yet, an inline warning: *"You haven't set a PIN yet — set one in Settings first."* with a direct link |
| 4 | **Hard Block** | Circle with a bar through it | Radio · icon · name · friction dots (●●●●) | "No access while this constraint is active." |

These four lines are final V2 copy, not placeholders — short enough that showing them only for the selected row keeps the picker compact, plain enough that a first-time user reads all four eventually (by clicking through) and comes away understanding Checkpoint → Delay → PIN Required → Hard Block as an escalating scale without needing a paragraph of explanation anywhere. If someone wants more than one sentence, that's what the future Settings/About "How constraints work" entry is for (§17) — the picker itself stays terse on purpose.

The friction dots alone carry the "Checkpoint is lightest, Hard Block is firmest" message even when a row is collapsed — a user never needs to expand all four to understand the ordering.

**Full flow — final architecture: a dedicated screen, not a modal or a floating panel.**

```
←  Add constraint

Domain
[ youtube.com                      ]

☐ Private constraint
  Hides the domain in Boomrng's own screens
  until you unlock it with your PIN. Not encrypted.

Behavior
┌────────────────────────────────────┐
│ ● ⌒ Checkpoint             ●○○○   │
│     A quick pause before opening    │
│     the site.                       │
├────────────────────────────────────┤
│ ○ ⏵ Delay                  ●●○○   │
├────────────────────────────────────┤
│ ○ 🔒 PIN Required           ●●●○   │
├────────────────────────────────────┤
│ ○ ⊘ Hard Block              ●●●●   │
└────────────────────────────────────┘

+ Add a reason

                            [ Add constraint ]
```

(Delay/PIN Required/Hard Block render collapsed to one line each in this example, since Checkpoint is selected; selecting any other row collapses Checkpoint in turn and expands that row in place.)

**Architecture correction — this section's second revision.** The first version specified a centered `Modal`; the second proposed a `SlidePanel` floating over Sites. Both were wrong for the same underlying reason, confirmed by measuring the shipped Modal implementation directly: a floating card — centered, bordered, capped at `90vh`, with its own header and body padding — costs roughly **104px of pure chrome** (40px header + 32px body padding + 32px of overlay centering padding) before a single form field renders, inside a popup whose *entire* height budget tops out at 600px (560px at the time of this measurement — see §8). Measured against the actual form, the shortest possible configuration (Checkpoint selected) already required internal scrolling *inside the already-nearly-full-height card*. That is the real cause of the crowded feeling reported after this flow shipped — not the amount of information in the form, which testing confirmed was already right.

**The fix: Add Constraint and Edit Constraint are first-class dedicated screens**, not an overlay of any kind:

- **The persistent app header (arc mark, wordmark, status dot) and the bottom navigation are both hidden** while this screen is active. Neither is relevant mid-creation, and hiding both reclaims their combined height for the form.
- **A lightweight focused header replaces them:** a back arrow (`IconButton`, `aria-label="Back to Sites"`) followed by a plain text title — `"Add constraint"` or `"Edit constraint"` depending on mode. No `×`, no modal-style header bar with its own border-and-padding budget — this is the same 40px-tall header rhythm already established elsewhere in the shell (§8), reused, not a new chrome element invented for this one screen.
- **The form occupies the full popup body**, `16px` padding, exactly like Dashboard/Sites/Settings already do. **No card. No border around the form. No drop shadow.** It is the popup's content, not a thing floating on top of the popup's content.
- **One natural page scroll, never a nested scrollport.** If the content exceeds the popup's height, the screen itself scrolls — there is no inner scrolling container competing with an outer one.
- **Back returns to Sites.** It is the *only* dismissal control (see Navigation & Focus below) — there is no second `×` anywhere on this screen.

This supersedes both earlier proposals in this section. `SlidePanel` as a distinct component is retired — a "panel that slides in from the side" and "a dedicated screen" solve the same navigational need, and only the screen version actually removes the chrome overhead that caused the problem. Component inventory and screen inventory are updated accordingly (§23, §24).

**The full-page live preview from the first version of this flow remains removed from the production creation screen**, for the same reason as before: it doesn't earn its vertical cost on every single constraint a user creates. The "understand the consequence before saving" goal is carried by the friction dots, the one-line description, and the enforcement page itself being fast to see for real on first visit. Reclassified as **V2 Later** (§18), not reconsidered here.

**Private constraint toggle** sits directly under the Domain field — see §26. It's a property of the domain, not the behavior, so it belongs beside the field it protects.

**Optional reason — collapsed by default, a density refinement on top of the architecture change.** The reason field (stored on `Constraint.customMessage` — the same field the retired custom-message behavior used, repurposed rather than duplicated, since that behavior never displayed it anywhere and the field was otherwise dead) does not render as an open textarea by default when creating a constraint. Instead, a quiet ghost text action — *"+ Add a reason"* — sits where the field would be; selecting it reveals the actual input in place. **Editing a constraint that already has a stored reason shows the field expanded immediately** — there is nothing to disclose progressively when the information already exists and the user came here to see it. The reason stays optional either way, and every previously-stored reason continues to load and save correctly; this is a presentation change, not a data change.

Selecting a behavior expands its row **inline, in place** — this is one continuous screen, not a wizard with forward/back steps. That remains true whether the screen is reached directly or (later) via a preset review step (§29).

**The primary action is explicit text, never an icon, and there is no Cancel button anywhere on this screen.** Unchanged from the previous revision of this decision:

1. **The primary action says what it does, in words — "Add constraint" when creating, "Save changes" when editing.** A checkmark or similar icon is ambiguous for a state-changing action taken occasionally; per the icon/text principle (§27), this keeps its label. The button is compact — auto-width, ~36px tall — not the full-width 40px treatment reserved for enforcement pages' single dominant action (§7). It sits alone, bottom-right.
2. **There is still no Cancel button.** On the old Modal, the header `×` did this job; on the new screen, the back arrow does. One dismissal control, doing one job, is enough regardless of which container holds the form. If unsaved-changes protection is ever warranted, that's a deliberate future product decision layered on top of plain Back — not a default to reach for now merely because this is a screen instead of a dialog (see Navigation & Focus).

**Navigation & focus, now that this is a screen and not a dialog:**
- **No focus trap.** A dialog traps focus because there's a page behind it the user could accidentally tab into; a full screen has nothing else rendered at all while it's active (the header and bottom nav are hidden, not just visually covered), so there's nothing to trap focus away from. Tab moves through the screen's own elements in plain document order.
- **Escape is a deliberate choice, not an inheritance from `Modal`.** It triggers the same action as the back arrow. This was decided explicitly rather than carried over, because a screen's Escape behavior isn't implied by anything — a dialog's is.
- **Domain autofocuses only in Add mode.** In Edit mode, the field already holds a real value; autofocusing it would place a cursor in existing text as the very first thing that happens, which reads as an accidental edit waiting to happen rather than an invitation to type. Edit mode instead focuses the screen itself, so keyboard and screen-reader users land at a sensible, deliberate starting point without an unintended text-cursor side effect.
- **Returning to Sites restores focus sensibly, not by accident.** After Add, focus returns to the control that opened the flow (the empty-state button or the header `+`). After Edit, focus returns to the specific row's Edit button. Sites remounts fresh each time (the simplest correct architecture, per below) — this only works because the return path explicitly carries *what to focus*, not because a DOM node happened to survive.

**The simplest architecture that also leaves room for Presets (§29):** a single piece of state, owned where the header and bottom navigation are already controlled, represents "a focused sub-flow is active" as an alternative to the normal three-screen switch — not a new router, not a navigation stack. Returning from the flow clears that state and lands back on the calling screen. Presets' own multi-step flow (gallery → review → behavior → confirm) is more of the same kind of state, reusing the identical hide-header/hide-nav/full-body shell — it does not require revisiting this decision when it's built.

The existing `Modal` component (well-built, real focus trap) is **not discarded** — it remains correct for short, single-decision confirmations (delete constraint), which is a genuinely different interaction than "fill out a form": something the user must resolve before continuing, layered over content that's still relevant behind it. Add/Edit Constraint is the opposite of that — the calling screen isn't relevant while it's happening, which is exactly why it stops using a dialog.

---

## 12. Checkpoint — Signature Interaction, Redesigned

**What it must communicate:** *"You were heading here. Is that what you meant to do?"* — observational, not accusatory.

**Page composition (top to bottom):**
1. Arc mark (small, quiet — not a large centered icon; this is not a warning screen)
2. Domain, monospace, `--text-primary`, in a subtle bordered chip (kept from the current implementation — this detail already reads well)
3. Headline: **"You were heading to [domain]."**
4. Subhead: **"Is that what you meant to do?"**
5. *If a personal reason was set on this constraint:* a quoted, indented, italic line — **"You told yourself: 'I said I'd write, not scroll.'"** — rendered in secondary text color, clearly distinguished as the user's own words being reflected back, not system copy.
6. Primary action, full-width, filled accent, `--text-on-accent` label: **"Back to what I was doing"**
7. Secondary action, plain text link beneath, muted: **"Continue to [domain] anyway"** — naming the domain again here (not just "Continue anyway") removes any ambiguity about what clicking it does.

```
┌──────────────────────────────────┐
│              ⌒                   │
│                                   │
│         [ twitter.com ]          │
│                                   │
│   You were heading to twitter.com.│
│      Is that what you meant to do?│
│                                   │
│   You told yourself:              │
│   "I said I'd write, not scroll." │
│                                   │
│  ┌─────────────────────────────┐ │
│  │   Back to what I was doing   │ │
│  └─────────────────────────────┘ │
│                                   │
│      Continue to twitter.com anyway │
│                                   │
└──────────────────────────────────┘
```

**The primary visual action is "Back to what I was doing," full width, filled, first in tab order, focused on page load.** This is the single most important fix from the audit (the current implementation has this backwards) and is non-negotiable for V2.

**Keyboard interaction:** primary button auto-focused on load; `Enter`/`Space` activates the focused element; `Escape` triggers the primary ("back") action directly, since going back is always the safe, no-harm-done choice; `Tab` moves to the secondary link.

**Small-window resilience:** single-column layout with no fixed min-width assumption; padding compresses gracefully (32px → 20px) below ~340px viewport width rather than clipping or introducing horizontal scroll — verified as a design requirement here since Chrome allows enforcement pages to render in oddly-sized popped-out windows.

**Private constraint variant** (see §26 for the full policy): the domain chip and the personal-reason block are both omitted entirely — not blanked, not replaced with a placeholder, simply absent. Headline becomes the generic **"This site is constrained."**, subhead is unchanged ("Is that what you meant to do?" doesn't name anything), and the secondary link drops the domain too: **"Continue anyway."** This is the one enforcement page whose private variant requires actual copy changes, since the normal-case copy names the domain by design.

---

## 13. Delay — Detailed Design

**Rejecting the giant digital clock.** A 48px LCD-style countdown (as proposed in the earlier design doc) reads as a timer on a device counting down to something bad — closer to punitive than calm. V2 replaces it with the **closing arc** (§3's motif made functional): a radial ring that visually closes as time elapses, paired with a modest, legible numeric readout — not a dominant one.

```
┌──────────────────────────────────┐
│                                   │
│         [ reddit.com ]           │
│                                   │
│         ⌜         ⌝              │  ← arc ring, ~2/3 closed
│           12 min                 │  ← 28px mono, not 48px
│          remaining               │
│                                   │
│   This will be ready shortly.     │
│                                   │
│  ┌─────────────────────────────┐ │
│  │   Back to what I was doing   │ │
│  └─────────────────────────────┘ │
│                                   │
│   (Continue link appears here     │
│    only once the delay ends)      │
│                                   │
└──────────────────────────────────┘
```

- **During the countdown:** only "Back to what I was doing" is shown. No disabled "Continue" button sits there the whole time — a button that's visibly present but unusable for fifteen minutes reads as a taunt, not a feature. This is a deliberate change from both the current implementation and the earlier design doc's spec, both of which show a disabled Continue button throughout.
- **On completion:** the ring closes fully, the readout changes to **"Ready."**, and **"Continue to [domain]"** fades in beneath the primary button over ~300ms — a small, quiet reveal, not an alert.
- **Configured delay is honored:** the ring's duration and the readout are driven directly by `constraint.delayMinutes` — this replaces the current hardcoded 30-second value (audit §15) and is a functional requirement of this redesign, not just a visual one.
- **Persists across refresh:** keep the existing, already-correct pattern of storing an absolute `endTime` in `chrome.storage.local` keyed per domain — this part of the current implementation works and should not be touched beyond adapting it to the new visual treatment.
- **Original destination preserved:** the domain the ring/readout reference and the eventual "Continue" target must be the full pending URL (path + query), not just the bare domain — this closes the destination-fidelity gap identified in the audit (§15) for both Checkpoint and Delay simultaneously, since they share the same underlying navigation helper.
- **Copy:** "This will be ready shortly." while running (not "Please wait" — passive and slightly cold); "Ready." on completion.
- **Keyboard:** identical semantics to Checkpoint — primary ("back") focused and `Escape`-triggered throughout; once "Continue" appears, it joins the tab order after the primary button, never before it.

**Private constraint variant:** omit the domain chip only. Everything else on this page is already domain-free by construction — the readout ("12 min remaining", "Ready.") and the running copy ("This will be ready shortly.") never named the site to begin with. The one exception is the completion-state copy, which must be written domain-generically from the start ("This site is available again." rather than "reddit.com is available again.") so the private and normal variants only differ by whether the chip and the "Continue to [domain]" label include the name — the sentence structure itself doesn't change.

---

## 14. PIN — Full Design (Settings + Enforcement)

### Settings

- **Explanation line**, always visible above the PIN controls: *"Your PIN protects PIN-required sites, and stops someone else from clearing your constraints."* — states what it's actually for, once, plainly.
- **Set PIN** (no PIN currently set): two fields, **New PIN** and **Confirm PIN**, both 4–6 digit masked inputs. Save is disabled until both match and pass format validation. Inline error: *"PINs don't match."* if they diverge on blur.
- **Change PIN** (a PIN already exists): three fields — **Current PIN**, **New PIN**, **Confirm PIN**. Requiring the current PIN before allowing a change is a deliberate addition over the current implementation, which lets anyone with the browser open silently overwrite the PIN with no verification — a PIN with no self-protection against casual tampering isn't providing the protection its own explanation line claims.
- **Clear PIN:** requires **Current PIN** entry to confirm, same reasoning as above. Confirmation copy: *"This removes PIN protection from all PIN-required sites."*
- **Status line:** "PIN protection is on." / "No PIN set." — always visible, matching the current implementation's good instinct here.

### Enforcement (PIN Required page)

```
┌──────────────────────────────────┐
│         [ reddit.com ]           │
│                                   │
│   This site requires your PIN.    │
│                                   │
│        [ • • • •         ]       │
│                                   │
│      Incorrect PIN. Try again.    │  ← only shown after a failed attempt
│                                   │
│  ┌─────────────────────────────┐ │
│  │        Verify PIN            │ │  ← primary
│  └─────────────────────────────┘ │
│        Back to what I was doing   │  ← ghost text link, not a box —
│                                   │    revised, see §7
└──────────────────────────────────┘
```

- Single masked input, focused automatically on load.
- Auto-submits on the 6th digit, or on `Enter` at 4–6 digits.
- On success: navigates directly to the original destination — no separate "success" screen or delay.
- On failure: input clears, gentle shake (respects reduced-motion), error text appears with `aria-live="assertive"` (§22), focus returns to the input.
- "Back to what I was doing" remains available at every point — a wrong PIN is never a dead end. **Revised treatment (§7):** this is the one enforcement page with two simultaneous actions, so "Back to what I was doing" drops the bordered box it had in the first version of this section and becomes the same plain ghost text link Checkpoint and Delay already use for their secondary action — keeping "Verify PIN" as the only filled control on the page.
- **Private constraint variant:** omit the domain chip only. "This site requires your PIN." was already domain-free.

---

## 15. Hard Block — Detailed Design

**No red. No "ACCESS DENIED." This is a boundary the user drew for themselves, not a security system rejecting them.**

```
┌──────────────────────────────────┐
│              ⊘                   │  ← muted outline icon,
│                                   │    not red, not filled
│         [ tiktok.com ]           │
│                                   │
│      You've closed this one off.  │
│                                   │
│  ┌─────────────────────────────┐ │
│  │   Back to what I was doing   │ │
│  └─────────────────────────────┘ │
│                                   │
└──────────────────────────────────┘
```

- **Visual treatment:** `--text-primary`/`--text-secondary` only, muted icon in `--text-muted` — deliberately the calmest-looking page in the product, not the most severe. Severity is communicated by the *absence of a second option*, not by color or size.
- **Copy:** **"You've closed this one off."** — plain, past-tense, ownership-affirming (it centers the user's own decision, not the system's judgment).
- **Available action:** exactly one — "Back to what I was doing." No "Continue anyway" exists here by design; that's the entire functional difference from Checkpoint.
- **Back behavior:** identical mechanism to Checkpoint/Delay (`history.back()` with a real-destination fallback, not a domain-root guess).
- **Private constraint variant:** omit the domain chip only. "You've closed this one off." never named the site — Hard Block's copy was accidentally private-safe from the start, which is the reason its variant requires the least work of any enforcement page.

---

## 16. Tab Budget — Redesign

### Popup representation (Dashboard card, detailed in §9)
Arc-ring fill (reusing `ProgressArc`, tying to the motif) + "N of M" + one contextual line. Color shifts: `--accent` under 70% of budget, `--warning` 70–99%, `--destructive` at or over.

### Over-budget enforcement page

```
┌──────────────────────────────────┐
│      Tab budget: 11 of 10         │
│                                   │
│   Close a tab to keep going.      │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ docs.python.org          [×]│ │  ← oldest first
│  │ stackoverflow.com        [×]│ │
│  │ github.com               [×]│ │
│  │ ...                          │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │      Close oldest tab        │ │
│  └─────────────────────────────┘ │
│                                   │
└──────────────────────────────────┘
```

- **Tab information shown:** page title (truncated) as the primary line, domain as a smaller secondary line if the title is uninformative — no favicon dependency (adds complexity for marginal benefit at this list density).
- **Ordering:** oldest tab first (matches the existing `getOldestTabs` intent already sketched in the codebase's architecture notes, now actually implemented) — the assumption is that the oldest tab is most likely already stale/forgotten.
- **Close interaction:** an inline `[×]` per row closes that specific tab immediately; a single primary button, **"Close oldest tab,"** closes just one tab per click — deliberately *not* a bulk "close 3 tabs" action, since a one-click irreversible multi-close is a worse failure mode (wrong tab closed) than asking the user to click once per tab they're sure about.
- **Protected/current tab behavior:** the enforcement page's own tab, pinned tabs, and `chrome://`/extension pages are excluded from the closable list entirely (this logic already exists in the codebase's tab-exclusion helper — reuse it, don't rebuild it).
- **Once below budget:** the page automatically detects the change (via the same `chrome.tabs` listeners already used for the badge) and navigates to the original pending destination without requiring a manual "Try again" click — this directly replaces the current dead-end retry loop identified in the audit.
- **Explicitly not built:** no drag-to-reorder, no multi-select, no search/filter — this is a short, purpose-built list for one task (get back under budget), not a tab manager.

---

## 17. Settings — Detailed Design

Four sections, nothing more:

1. **PIN** — set/change/clear flow (§14), explanation line. Its explanation line now covers two responsibilities, not one: *"Your PIN protects PIN-required sites, unlocks private constraints, and stops someone else from clearing your constraints."* No separate "Private Constraints" section is added to Settings — the PIN section already owns this, and unlocking itself happens on Sites (§26), not here.
2. **Tab Budget** — single number stepper (min 1, no artificial max), helper text: *"Set to 0 for no limit."*
3. **Data** — Export / Import buttons (kept as-is; already functional and low-risk).
4. **About** — version number, one-line privacy statement in plain language ("Everything stays on this device. No accounts, no analytics, no sync."), link to `PRIVACY.md`. **Reserve a small "How constraints work" entry here** for a future pass, once there's a concrete need for an explanation longer than the one-liners in the behavior picker (§11) support — the picker itself stays terse by design (§4, Behavior Education), so this is where the fuller version lives if it ever needs to exist. Not built this pass; just reserved as a known future slot so it doesn't get bolted onto the picker instead when the need arises.

**Strict Mode: cut from V2 Core entirely**, not merely "redesigned later" as the audit suggested. On reflection, rebuilding it properly (auto-escalating every constraint to Hard Block) introduces a *second* global state that the user has to mentally track on top of each constraint's own behavior — "wait, is this Checkpoint site actually going to Hard Block right now because Strict Mode is on?" is exactly the kind of hidden-state complexity the whole redesign is trying to remove. The V2 constraint model already expresses increasing friction on its own, per-constraint — Checkpoint → Delay → PIN Required → Hard Block (§11) — so a second, global "make everything stricter" dial is redundant with a system that already has escalation built in, not complementary to it. If a genuine need for a temporary global escalation resurfaces, it should be **time-boxed** (a 25/50/90-minute "focus session" that expires on its own, not an indefinite toggle) — flagged as V2 Later, and only worth building if real usage demonstrates people actually want it.

**Removal timing, stated explicitly:** the Strict Mode toggle is cut from the *design* as of this document, and no further design effort should go into explaining, promoting, or refining it. The *code* is removed during the **Settings V2 implementation milestone**, alongside the rest of that screen's rebuild — not earlier, and not as a drive-by change during an unrelated milestone, since ripping out a working (if pointless) toggle outside its own milestone would touch `Settings.tsx` and its stored-settings shape for no reason connected to whatever that other milestone is actually about. Until that milestone lands, the toggle keeps functioning exactly as it does today; it's just no longer part of the V2 product story.

**Landing Page, Max Overrides Per Day, Require-PIN-After:** confirmed removed per the audit — no UI, no schema retained unless a future phase actually builds the feature behind them.

---

## 18. Onboarding

**There is no dedicated onboarding flow.** Onboarding *is* the empty state plus the creation flow's built-in preview — nothing else is built:

1. Install → first popup open → Dashboard shows the empty state (§9): *"Nothing constrained yet. Add a site you want a pause before opening."* + one button.
2. Tap the button → the creation flow opens (§11) → user types a domain, sees Checkpoint pre-selected as the recommended default, sees the live preview at the bottom update in real time as they type.
3. Save → panel slides away → Dashboard now shows the new constraint in its list → the user has, in the same motion, learned what a constraint is, what a behavior is, and what will happen, without reading a single explanatory paragraph.

No carousel, no five-step tour, no forced PIN setup gate, no "skip for now" button anywhere. Total added surface for onboarding: one rewritten empty-state string. Everything else is the product's normal creation flow doing double duty, which is the actual goal stated in the request ("the user should experience Boomrng rather than reading about it").

---

## 19. Motion & Interaction Language

| Moment | Treatment | Duration | Meaning communicated |
|---|---|---|---|
| Screen transition (bottom nav) | Crossfade + 4px vertical settle | 140ms | "You're still in the same app, just a different view" |
| Creation panel open/close | Slide in/out from right | 180ms ease-out (in), 140ms ease-in (out) | "Going deeper" / "returning" — spatial metaphor, not decoration |
| Constraint saved | New row briefly tints from accent-at-10%-opacity back to normal over 400ms | 400ms | "This is the thing that just changed" — replaces a toast for this specific case since the row itself is the confirmation |
| Button press | Scale to 0.98 | 80ms | Physical acknowledgment of the tap |
| Button hover/focus | Background/border shift | 120ms | Standard affordance |
| Delay ring | Continuous, real-time closing arc | tied to actual remaining time | The motif's most meaningful appearance — the animation *is* the information, not an add-on |
| Delay completion | "Continue" link fades in | 300ms | A quiet unlock, not a celebration |
| Tab closed (Tab Budget page) | Row collapses + fades rather than snapping out | 150ms | Avoids a jarring list-jump |
| Enforcement page arrival | Subtle content fade-in | 150ms | Softens the fact that this is a hard browser navigation, not an SPA transition |
| Loading | Partial-arc spinner rotation | 700ms/rotation, linear | Ties to the motif (§3) instead of a generic full-circle spinner |

**`prefers-reduced-motion`:** every entry above degrades to an instant state change (opacity swaps only where already opacity-based; everything else becomes a hard cut). The Delay ring is the one exception that must still *render correctly* without animating — it shows its real current fill state, just without a smooth transition between updates.

---

## 20. Iconography

**System:** custom-drawn SVG, single family, 1.5px stroke, rounded joins, 20×20 grid, no fills except for small deliberate accent dots (e.g., the Checkpoint glyph's dot). No third-party icon font — keeps the set small, fully controlled, and consistent with the motif rather than borrowing a generic library's visual language.

| Context | Concept |
|---|---|
| Checkpoint | Open arc with a small dot at one terminus — the pause-and-choose glyph |
| Delay | Partial ring (¾ circle), distinct from a literal clock face — ties directly to the Delay page's own ring |
| PIN | Minimal outline padlock, no keyhole detail at small sizes |
| Hard Block | Circle outline with a single horizontal bar through it — a boundary, not a prohibition sign; no red, no diagonal slash (avoids "no entry" road-sign connotation) |
| Tab Budget | Two or three stacked rectangle outlines, one subtly highlighted — a minimal browser-tab glyph |
| Settings | Plain gear outline — no need to reinvent a universally understood glyph |
| Sites | Minimal globe outline (represents "a site" concretely) |
| Dashboard | Small grid of 4 squares (overview/layout glyph) |
| Add | Plain "+" — no embellishment |
| Edit | Simple outline pencil |
| Delete | Simple outline trash can (kept visually distinct from "close"/"×") |
| Export | Arrow pointing up-and-out of an open-top tray |
| Import | Arrow pointing down-and-into the same tray shape (paired visual language with Export) |
| Private constraint | The same minimal padlock used for PIN, at a smaller size, muted-colored — deliberately reused rather than a new glyph, since both concepts already mean "gated by your PIN" (§26) |

All icons share stroke weight and are drawn on the same grid so they sit consistently at 16px in lists and buttons without individual optical resizing.

---

## 21. Microcopy System

| Context | Copy |
|---|---|
| Dashboard — active | "3 constraints active" |
| Dashboard — empty | "Nothing constrained yet." / "Add a site you want a pause before opening." |
| Sites — empty | "Nothing here yet." / "Add your first constraint to get started." |
| Add constraint — focused header | "Add constraint" (title) · back arrow, `aria-label="Back to Sites"` (§11, §27) |
| Edit constraint — focused header | "Edit constraint" (title) · same back arrow |
| Add constraint — primary action (create) | "Add constraint" — compact, text, never an icon (§27) |
| Add constraint — primary action (edit) | "Save changes" |
| Add constraint — domain error | "Enter a valid domain, like twitter.com." |
| Add constraint — duplicate | "This domain already has a constraint." |
| Add constraint — save confirmation | *(no toast needed — the new row itself is the confirmation, §19)* |
| Add constraint — behavior descriptions | Checkpoint: "A quick pause before opening the site." · Delay: "Wait for a time you choose before you can continue." · PIN Required: "Enter your Boomrng PIN before continuing." · Hard Block: "No access while this constraint is active." (§11) |
| Add constraint — reason, collapsed | "+ Add a reason" (ghost text action; expands the field in place, §11) |
| Add constraint — reason, expanded | Label: "Remind yourself why (optional)" |
| Sites — add button (populated state) | icon only, `+`, `aria-label="Add constraint"`, native tooltip on hover/focus (§10, §27) |
| Checkpoint — headline (normal) | "You were heading to [domain]." |
| Checkpoint — headline (private, §26) | "This site is constrained." |
| Checkpoint — subhead | "Is that what you meant to do?" |
| Checkpoint — primary action | "Back to what I was doing" |
| Checkpoint — secondary action (normal) | "Continue to [domain] anyway" |
| Checkpoint — secondary action (private) | "Continue anyway" |
| Delay — running | "This will be ready shortly." / "[N] min remaining" |
| Delay — complete (normal) | "Ready." / "[domain] is available again." |
| Delay — complete (private) | "Ready." / "This site is available again." |
| Hard Block — headline | "You've closed this one off." *(already domain-free — identical in the private variant)* |
| PIN — prompt | "This site requires your PIN." *(already domain-free)* |
| PIN — error | "Incorrect PIN. Try again." |
| PIN — settings mismatch | "PINs don't match." |
| PIN — settings status | "PIN protection is on." / "No PIN set." |
| Tab Budget — over | "Tab budget: [N] of [M]." / "Close a tab to keep going." |
| Tab Budget — action | "Close oldest tab" |
| Settings — about | "Everything stays on this device. No accounts, no analytics, no sync." |
| Import — success | "Constraints imported." |
| Import — failure | "That file doesn't look like a Boomrng export." |
| Export — success | *(the file download itself is the confirmation — no toast required)* |
| Delete confirmation (normal) | "Remove the constraint for [domain]?" / buttons: "Cancel" / "Remove" |
| Delete confirmation (private) | "Remove this private constraint?" — never names the domain, since deletion is intentionally un-gated (§26) |
| Invalid domain (generic reuse) | "Enter a valid domain, like twitter.com." |
| Add constraint — private toggle | "Private constraint" / hint: "Hides the domain in Boomrng's own screens until you unlock it with your PIN. Not encrypted." |
| Add constraint — private, no PIN set | "You haven't set a PIN yet — this will stay masked, but anyone can unlock it without one. Set a PIN in Settings." |
| Sites — reveal bar, locked | "[N] private constraints are hidden." / action: "Unlock" |
| Sites — reveal bar, unlocked | "Private constraints unlocked for this session." / action: "Lock again" |
| Sites — reveal bar, no PIN set | "Set a PIN in Settings to unlock private constraints." |
| Sites — masked row | "Private site" (sans-serif italic, not monospace — see §10) |
| Dashboard — "View all" | "View all" — never "View all [N]" (§9); appears whenever the total exceeds what's shown, whatever the reason |
| Export — private constraints present | "This export will include [N] private constraint(s) with their real domain(s), in plain text. This file is not encrypted — anyone who opens it can read them." / checkbox: "Include private constraints" (unchecked by default) |

**Rules applied throughout:** no exclamation points, no emoji, second person where the user is being addressed, the product's own name never used as the subject of a sentence about the user's behavior ("You've closed this one off," not "Boomrng has blocked this site").

---

## 22. Accessibility

- **Contrast:** `--text-primary` (`#EEF5F1`) on `--canvas` (`#0A2119`) and `--text-secondary` (`#9EB3AA`) on the same background both clear 4.5:1 comfortably. Filled accent buttons use `--text-on-accent` (near-black), not white, to clear 4.5:1 against `--accent` (§5's contrast note) — this must be enforced as a hard rule, not left to per-component judgment.
- **Focus rings:** `2px solid var(--focus-ring)` with `2px` offset, applied via `:focus-visible` (never `:focus`, to avoid a ring on every mouse click) — required on every interactive element including the new `BehaviorOption` cards and list rows, not just form inputs.
- **Keyboard navigation:** the entire product must be operable with `Tab`/`Shift+Tab`/`Enter`/`Space`/`Escape` alone — bottom nav, the behavior picker (as a real `radiogroup`, arrow-key-navigable), the slide panel, every enforcement page.
- **Modal/panel focus:** the existing `Modal` component's focus-trap and focus-restore behavior (already correctly implemented) is extended to the new `SlidePanel` component, not reimplemented from scratch.
- **Screen reader labels:** every icon-only button (`edit`, `delete`, `close`) gets an explicit `aria-label`; the header status dot gets an `aria-label` describing state in words ("Boomrng active, 3 constraints"); `ProgressArc`/`ProgressBar` use `role="progressbar"` with `aria-valuenow`/`min`/`max`.
- **Semantic HTML:** real `<button>`/`<nav>`/heading hierarchy throughout; the behavior picker uses `role="radiogroup"`/`role="radio"` semantics (or native radio inputs styled to match), not unlabeled `<div>`s with click handlers.
- **Reduced motion:** every transition in §19 has a defined instant/opacity-only fallback; this is a requirement, not an enhancement.
- **Error announcements:** PIN failure and form validation errors use `aria-live="assertive"` so they're announced immediately without requiring the user to move focus to discover them.
- **Countdown accessibility:** the Delay ring is `aria-hidden` (decorative); the actual accessible content is the text readout, updated in an `aria-live="polite"` region on a coarse interval (e.g. once per minute, or on significant transitions) — never announcing every second, which would make the page unusable with a screen reader running.

---

## 23. V2 Screen Inventory

| Screen | Purpose | Entry point | Primary action | Secondary action | Important states |
|---|---|---|---|---|---|
| Dashboard | At-a-glance preview, not management | Default popup view | Tap a constraint row → edit | "Add first constraint" (empty state) / "View all" → Sites | Empty (zero constraints), preview (≤3 public rows), truncated (>3 public or any hidden), all-private (count only, no rows), over-budget |
| Sites | Manage constraints | Bottom nav | Icon-only `+` (populated) / "Add your first constraint" (empty, never both, §10) | Edit / delete per row, unlock private constraints | Empty, populated, private constraints locked / unlocked / no-PIN-set |
| Add Constraint (dedicated screen) | Create a constraint | `+` (Sites, populated) or "Add your first constraint" (Sites, empty) | "Add constraint" — compact, text, §7/§11/§27 | Back (arrow, header) — no Cancel (§11) | Compact accordion (one behavior expanded at a time), private toggle, reason collapsed by default, validation error — no live preview in production (§11) |
| Edit Constraint (dedicated screen, same component as Add) | Modify an existing constraint | Row's Edit control on Sites | "Save changes" — compact, text | Back (arrow, header) — no Cancel | Same as Add, pre-filled; reason expanded automatically if already set (§11) |
| Settings | PIN, Tab Budget, Data, About | Bottom nav | Section-specific (Save PIN, etc.) | — | PIN set / not set, exporting (with/without private constraints, §26), importing |
| Checkpoint (enforcement) | The signature pause | DNR redirect on constrained domain visit | "Back to what I was doing" | "Continue to [domain] anyway" | With/without personal reason; normal vs. private (domain withheld, §26) |
| Delay (enforcement) | Timed pause | DNR redirect, `delay` behavior | "Back to what I was doing" | "Continue" (appears only on completion) | Running, complete, refreshed mid-countdown; normal vs. private |
| PIN (enforcement) | Gated access | DNR redirect, `pin-required` behavior | "Verify PIN" (auto-submits) | "Back to what I was doing" (ghost link, §7) | Empty, error, success; normal vs. private (domain withheld) |
| Hard Block (enforcement) | Firm boundary | DNR redirect, `hard-block` behavior | "Back to what I was doing" | — (none) | Single state; normal vs. private (domain withheld) |
| Tab Budget (enforcement) | Over-limit recovery | Tab-count listener redirect | "Close oldest tab" | Per-row `[×]` close | Over budget, resolved (auto-continues) |

Ten surfaces total — the three popup screens, Add and Edit Constraint as their own dedicated screens (sharing one implementation, §11), and the five enforcement pages. Add/Edit Constraint reuses the popup shell's own focused-sub-flow capability (§8) rather than introducing a new interaction primitive, so this still isn't a meaningfully larger surface than the "nine, plus a slide panel" count from the previous revision of this table — it's the same idea, correctly built. Private Constraints (§26) remains **not** a surface of its own — it's a property and a handful of states layered onto the screens above.

---

## 24. Design System Component Inventory

Kept intentionally small — this is a browser-action popup and five static pages, not an application platform.

| Component | Purpose | Variants | States |
|---|---|---|---|
| `Button` | Primary actions | primary (filled accent), secondary (bordered), ghost (text-only) | default, hover, focus, active, disabled, loading |
| `IconButton` | Compact icon-only actions (Sites' `+`, edit, delete, the focused-screen back arrow, the confirmation `Modal`'s `×`) | default, danger (delete) | default, hover, focus, disabled. Always carries an `aria-label` (its only accessible name) and a native tooltip (`title`) on hover/focus; hit area is padded to at least 32×32px regardless of the visible icon's size (§10, §27) |
| `Input` | Text/number entry | text, number, password | default, focus, error, disabled |
| `PINInput` | Masked digit entry with auto-submit | single-field (not segmented boxes — simpler, same accessibility properties) | default, error (shake), disabled |
| `BehaviorRow` *(renamed from `BehaviorOption`, §11)* | One row in the compact behavior accordion | collapsed, selected/expanded | default, hover, focus; expanded state renders its own description + config inline |
| `BehaviorBadge` | Compact behavior label in lists | one per behavior (4, not 8) | static |
| `DomainLabel` | Monospace-styled domain text | inline, chip (bordered, as on enforcement pages) | static; **not used** for a masked private constraint — see `PrivateLabel` below |
| `PrivateLabel` *(new, §26)* | "Private site" placeholder shown instead of `DomainLabel` while a private constraint is locked | masked, revealed (real domain + small "Private" tag) | static |
| `PrivacyToggle` *(new, §26)* | "Private constraint" checkbox in Add/Edit Constraint | unchecked, checked | default, focus; checked state may reveal the no-PIN-set warning |
| `RevealBar` *(new, §26)* | Sites-screen control for unlocking private constraints for the session | locked, pin-entry, unlocked, no-pin-set | default; unlocked persists only for the popup session |
| `ProgressArc` | Radial arc — Delay countdown, Tab Budget ring | closing (Delay), capacity (Tab Budget) | animating, static (reduced-motion), complete |
| `ProgressBar` *(kept as a distinct, simpler primitive)* | Any future linear-only progress need | — | — |
| `Modal` | Short, single-decision confirmations (delete) **only** — no longer used for Add/Edit Constraint (§11) | default | open, closing |
| `FocusedHeader` *(new, replaces `SlidePanel`, §11)* | Lightweight header for a focused sub-flow: back arrow + title, hides the persistent app header while active | default | default, focus (back button) |
| `ConstraintFormScreen` *(new, replaces `AddConstraintModal`/`EditConstraintModal`, §11)* | The dedicated Add/Edit Constraint screen — `FocusedHeader` + the existing form fields, full popup body, no card | add, edit | Same content states as the form always had; no dialog-specific states (no trap, no `×`) |
| `Toast` | Only for actions with no other visible confirmation (import success/failure) | success, error | entering, visible, exiting |
| `Section` | Settings grouping | default | — |
| `EmptyState` | Zero-content states (Dashboard, Sites) | default | — |
| `ConstraintRow` | A constraint in a list | read-only, public-only, capped at 3 (Dashboard, §9); editable, every constraint, private/masked, private/revealed (Sites) | default, hover (reveal actions on Sites), focus |
| `TabRow` | A tab in the Tab Budget over-limit list | default | default, closing (fade-out) |
| `StatusDot` | Header active/inactive indicator | active, inactive | static |

Explicitly not built as separate components: a full modal-vs-panel-vs-drawer abstraction layer, a generic "Card" wrapper used everywhere (per §7's rule, most content is not a card), a icon-font/registry system beyond the flat SVG set in §20, a dedicated "Private Constraints" settings screen (§26 explains why this stays inline instead).

---

## 25. V1 → V2 Visible Differences

What someone who used the current version notices immediately, beyond code quality or token consolidation:

1. **The Dashboard actually shows something** — a real status view instead of a blank placeholder.
2. **Checkpoint's prominent button now pulls you back to work**, not toward the site — the single most important behavioral flip in the whole redesign.
3. **The behavior picker is a compact, friction-ordered accordion**, not an eight-item alphabetized dropdown and not four permanently-expanded cards — every option shown now actually works, and only the one you're configuring takes up space.
4. **Delay's giant digital countdown is gone**, replaced by a closing arc and a modest readout — visually calmer, and it now honors the duration you actually configured instead of always waiting exactly 30 seconds.
5. **The Tab Budget block page lists your actual open tabs** with one-click close, instead of a dead-end "Try again" button that never gets you anywhere.
6. **Sensitive sites can be marked private** — the domain itself never appears in the Dashboard, Sites list, or any enforcement page until you unlock it with your PIN (§26). Nothing in the current build offers this at all.
7. **Constraint creation slides in as a panel**, not a centered modal-in-a-modal — and buttons throughout now use a softer, less boxy radius, with "Cancel" reading as a quiet ghost action rather than a bordered rectangle competing with Save.
8. **A single, custom arc-based icon system** replaces the ad hoc Unicode/emoji glyphs (◉ ⏳ ✕ 🔑) on every enforcement page.
9. **Settings is shorter** — Strict Mode, Landing Page, and override-limit fields that never did anything are gone, replaced by four sections that all actually do something.
10. **One consistent color system** across popup and enforcement pages, instead of two independently hand-rolled palettes that had already started to drift.

---

## 26. Private Constraints

A new V2 product requirement, added after the first prototype review: some constraints protect sites a user considers sensitive or personal — not a single category, but anything from gambling to dating to health browsing to a community they'd rather not have named on screen if someone glances at their laptop. Boomrng must never force a domain like that into view just because the user wanted a pause before opening it.

**Naming, deliberately general.** The feature is called **"Private constraint."** Not "adult mode," not "hidden sites," not any category-specific label — the whole point is that *any* domain can be marked private for *any* personal reason, and the product should never imply it knows or cares what that reason is.

### Data model

One new property on the constraint object: `isPrivate: boolean` (default `false`). It is independent of `behavior` — a private constraint can be Checkpoint, Delay, PIN Required, or Hard Block, exactly like a normal one. Nothing else about the constraint's evaluation or enforcement logic changes; `isPrivate` only governs what Boomrng's *own UI* is willing to display.

### Where it's configured

The **"Private constraint"** checkbox lives directly under the Domain field in Add/Edit Constraint (§11) — it's a property of the domain, not of the behavior, so it belongs beside the field it protects. Hint text under the label: *"Hides the domain in Boomrng's own screens until you unlock it with your PIN. Not encrypted."* That second sentence is not legal boilerplate — it's the single most important line of copy in this whole feature, and it appears at the exact moment someone is deciding whether to trust the checkbox. See "Export/Import" below for why it's phrased that way.

**If no PIN is set** when the checkbox is checked, an inline warning appears immediately (same visual pattern as the existing PIN-Required-behavior warning, reused rather than invented): *"You haven't set a PIN yet — this will stay masked, but anyone can unlock it without one. Set a PIN in Settings."* The constraint can still be created — masking still hides it from a casual glance at the Dashboard or Sites list even with no PIN — but the reveal gate itself has nothing to check against, so it's disclosed honestly rather than silently offering false protection.

### Display treatment

| Surface | Normal constraint | Private constraint |
|---|---|---|
| Sites row | `youtube.com` (mono) + behavior badge | 🔒 *Private site* (sans-serif italic — a label, not data) + behavior badge — **still shown as its own row**, since behavior/config is usually enough to tell constraints apart without the domain |
| Dashboard list | Individual row, same as Sites | **Not shown at all, in any form** (§9, revised) — no row, no rollup line, no "N private constraints" count. A private constraint contributes only to the plain-text headline total ("N constraints active"); nothing else about it reaches the Dashboard. This supersedes an earlier version of this section that rolled private constraints into a visible "N private constraints" summary row — that rollup was itself a leak, since it disclosed exactly how many constraints were private. |
| Personal reason | Shown, italic, on Sites row and Checkpoint page | **Withheld everywhere the domain is withheld** — a reason like "stop checking dating profiles" is exactly as identifying as the domain itself, so masking one and not the other would defeat the point. |

### Reveal & authentication (Sites screen)

This is the design that needed the most care, per the explicit ask to keep normal constraint management uncumbersome while making private ones genuinely gated:

- **A `RevealBar` sits at the top of the Sites list**, only rendered when at least one private constraint exists. Three states:
  1. **Locked** (default): *"[N] private constraints are hidden."* + an **Unlock** action.
  2. **Unlocked**: *"Private constraints unlocked for this session."* + a **Lock again** action. All private rows swap "Private site" for their real domain, tagged with a small muted "Private" pill so it's still clear which rows carry the flag.
  3. **No PIN set**: *"Set a PIN in Settings to unlock private constraints."* — no unlock control is offered at all in this state, because there is nothing to verify a PIN entry against. Never invent a fake "unlock" that accepts any input; that would be worse than no unlock at all.
- **Unlocking asks for the PIN inline** (a compact field replaces the "Unlock" button's row) — not a separate modal, not a navigation away from Sites. Correct entry reveals every private row for the rest of the popup session; **the unlocked state does not persist across a popup close/reopen** — this is a deliberate, stated limitation (no "remember for a day" option), matching the product's existing no-accounts, nothing-persisted-that-doesn't-need-to-be posture.
- **Editing a locked private constraint prompts for the PIN first**, then opens the Add/Edit panel already unlocked and pre-filled — the panel never opens with a masked domain the user then has to unlock separately, and it never opens with the real domain before the PIN check happens. If the constraint is already unlocked for the session, editing proceeds straight through with no repeated prompt — re-asking for a PIN the user already entered a moment ago would be the "cumbersome" failure mode explicitly flagged as something to avoid.
- **Deleting a private constraint is never gated.** Removing a constraint doesn't expose its domain to anyone — there's nothing to protect by adding friction here, so the delete icon on a locked private row works exactly like it does on a normal row, confirmation dialog and all (§10).
- **Opening Settings reveals nothing.** Settings has never listed domains and continues not to — the PIN section's explanation line now mentions that the PIN "unlocks private constraints" (§17), but no private domain ever appears on that screen, unlocked or not.

### Enforcement privacy

The operative rule, stated once here and applied per-page in §§12–15: **a private constraint's enforcement page never names its domain**, in the headline, the domain chip, or the personal-reason block — all three are either omitted or replaced with domain-generic copy. Concretely:

| Page | Normal copy | Private copy |
|---|---|---|
| Checkpoint | "You were heading to [domain]." | "This site is constrained." |
| Checkpoint (secondary action) | "Continue to [domain] anyway" | "Continue anyway" |
| Delay | domain chip shown; "[domain] is available again." | domain chip omitted; "This site is available again." |
| PIN Required | "This site requires your PIN." *(already domain-free)* | identical — only the domain chip is omitted |
| Hard Block | "You've closed this one off." *(already domain-free)* | identical — only the domain chip is omitted |

Hard Block and PIN Required needed no copy changes at all — their normal-case wording never named the domain to begin with, which turned out to be a small, accidental privacy asset already documented in the audit's tone guidance (state the fact, don't elaborate). Checkpoint and Delay are the two pages whose normal copy is deliberately personal ("you were heading to..."), so they're the only two that need an actual second copy variant.

**What Boomrng cannot control, and says so plainly:** the browser's own address bar will still show the real URL — that's standard browser chrome, entirely outside an extension's reach, and no amount of enforcement-page wording changes that. Private, in Boomrng's vocabulary, means *"Boomrng's own interface will not repeat this back to you or to anyone glancing at your screen while its own UI is open."* It is not a claim about the browser, the operating system, or anything outside the extension's surfaces. This distinction belongs in the feature's own hint copy in miniature (the "Not encrypted" line, above) and should also appear, spelled out in full, in the Settings/About or a linked privacy note, so the limitation is discoverable, not buried in a design document nobody using the product will ever read.

### Export / import privacy

The hardest honest question this feature raises: `export-service.ts` currently serializes the full constraint list to a human-readable JSON file with `JSON.stringify`. If a private constraint's real domain and reason text are included as plain text, the "private" promise is trivially defeated the moment that file is exported and shared, opened by someone else, or synced to a location outside the browser — regardless of how carefully the in-extension UI gates it. A PIN that only gates a UI layer provides zero protection to a file already sitting on disk.

**Options weighed:**
- Omit private constraints from export entirely, always — safest and simplest, but means they're never backed up, ever, which is a real, disclosed data-loss risk on reinstall or migration.
- Include them by default, unencrypted — rejected outright: this is the exact silent-leak scenario the whole feature exists to prevent.
- Require explicit opt-in confirmation before including them.
- Require PIN verification before the opt-in is even offered.

**Chosen V2 behavior — combine the last two, on top of a safe default:**
1. **Default export omits private constraints entirely.** The everyday "back up my settings" action is safe by construction and never needs a second thought.
2. **A separate, explicit opt-in** — a checkbox, unchecked by default, on the export screen: *"Include private constraints."* Checking it is gated by the same PIN unlock used on Sites (if no PIN is set, the checkbox is disabled with the same "set a PIN first" message used elsewhere).
3. **The moment it's checked, the exact, unhedged limitation is shown in plain language:** *"This export will include [N] private constraint(s) with their real domain(s), in plain text. This file is not encrypted — anyone who opens it can read them."* No mention of security, no implication that the PIN protects the file itself — because it doesn't, and claiming otherwise would be a security claim the implementation cannot support, which the brief for this feature explicitly warned against.
4. **Import respects the flag as-is** — a constraint imported with `isPrivate: true` stays masked in Boomrng's UI immediately, no re-confirmation needed, since importing doesn't newly expose anything beyond what the source file already contained. One caveat worth a single line in Settings/About: if that file came from somewhere else, whatever it contained was already outside Boomrng's control before it was ever imported — nothing on the import side can retroactively undo that.

**Documented limitation, stated once, plainly, and repeated at the point of use (the checkbox hint text, above):** "Private" in Boomrng means hidden from Boomrng's own screens until unlocked with a PIN. It is not encryption, and it is not a guarantee against anyone with direct access to the browser's storage or an exported file. This is the accurate, supportable claim; anything stronger would be a promise the current architecture (plaintext local storage, no cryptography anywhere in the codebase per the audit's engineering review) cannot keep.

---

## 27. Icon vs. Text — A General Principle

A recurring judgment call across every screen in this document (Sites' `+`, the creation panel's `×`, edit/delete throughout) is worth stating once as a rule rather than re-litigating per screen:

> **Use icons alone for familiar, reversible utility actions. Use text for important actions whose meaning needs to be unambiguous.**

**Icon-only is appropriate for:**
- **Add** (`+`) once a list is already populated — the user has seen the product do its job at least once, so the icon is saving space rather than hiding meaning.
- **Close** (`×`) on any modal or panel — near-universally understood, and reversible (closing loses nothing that wasn't already unsaved).
- **Edit** (pencil) — reversible; opens a screen that itself explains what happens next.
- **Delete** (trash) — *only* when followed by an appropriate confirmation step (§10, §17's `ConfirmationDialog`). The icon plus the confirmation together are unambiguous; the icon alone, with no confirmation, would not be.
- Other conventional utility actions with a single, well-established glyph and no real ambiguity about what happens on click.

**Text stays, even where an icon exists for the concept, when the action is:**
- **State-changing and not obviously reversible in the moment** — "Add constraint," "Save changes." A checkmark is a plausible icon for "save," but it's also a plausible icon for "confirm," "done," "select," or "correct" depending on context; the ambiguity isn't worth the horizontal space it saves on a button a user presses rarely per session.
- **A safety-relevant enforcement decision** — "Continue to site," "Back to what I was doing." These are the two actions the entire Checkpoint/Delay signature interaction (§12–13) exists to make legible; encoding either as an icon would undercut the whole point of that page.
- **Any other confirmation whose entire job is to be unambiguous** — when in doubt, this is the default, not the exception. Compactness is a nice property of an interface; it is never sufficient justification for a control the user has to decode.

**The test, in short:** if getting the icon's meaning wrong would cost the user something (data, a constraint they meant to keep, a moment of "wait, what did I just click"), it gets words. If getting it wrong just means one extra tap to notice and correct, it can be an icon. Do not pursue minimalism at the expense of comprehension — this principle exists specifically to keep that trade-off from being made silently, control by control, without anyone deciding it on purpose.

This section supersedes any per-component icon/text choice made earlier in this document that conflicts with it; §10 and §11 have already been updated to match (Sites' populated-state `+`, the creation panel's `×` and text-labeled primary action).

---

## 28. Product Landing Page (Post-Extension Deliverable)

A public Boomrng marketing/product page is part of the V2 program, but it is explicitly **sequenced after the extension itself is finished**, not concurrent with it. Recorded here so it isn't lost, not because it's next.

**Why it waits:** a landing page's job is to explain and sell a real product. Writing marketing copy for an interaction model that's still being revised (as this document's own history of corrections shows it still is) means rewriting that copy every time the product changes underneath it. Building the extension first means the landing page describes something that actually exists, once, correctly.

**What it will need to cover, when its turn comes:**
- What Boomrng is, and the positioning statement from §1.
- The intentional-browsing philosophy — friction as something the user chooses for themselves, not a restriction imposed on them.
- The four friction levels (Checkpoint → Delay → PIN Required → Hard Block, §11) as the core mechanic.
- How a constraint actually works, in plain terms — probably walking through the Checkpoint moment specifically, since it's the signature interaction (§12).
- Tab Budget as the secondary differentiator (§16).
- Private Constraints (§26) — this is a genuine, non-obvious differentiator worth explaining properly, including its honest limitation (not encryption).
- What makes this different from a conventional website blocker — the "why not just use LeechBlock" answer the audit's positioning work (§1) already worked out; the landing page's job is to make that case to someone who's never seen the product, not to invent a new one.

**The hard constraint this places on the extension itself:** the popup and enforcement pages must remain fully understandable on their own, without ever requiring a visit to the landing page to make sense. The landing page explains and markets Boomrng to someone deciding whether to install it; it is not where unclear in-product copy gets clarified after the fact. If a future reviewer finds themselves wanting to add "see our website for details" to any in-extension copy, that's a signal the in-extension copy needs fixing, not a justification for the link.

Not designed further in this document — this section only fixes *that* it exists, *when* it happens, and *what it must not be used to paper over*.

---

## 29. Presets — Documented Now, Not Built This Milestone

A product feature worth designing properly and building later, not something to bolt onto the Add Constraint flow as an afterthought. **Named "Presets."** Not "Quick Sets," and specifically not "frequently blocked sites" — the name should describe what the feature does (start from a curated group) without presupposing why the user wants each site constrained.

**Why this isn't built now:** the flow this needs — pick a preset, review its sites, add/remove entries, choose a behavior, confirm, then create several constraints at once — is a genuine second creation flow, not a variation of the existing one. It needs its own review screen, its own confirm step, and (for one preset specifically) its own privacy handling. That's real new surface area, not an "extremely isolated" addition, so per this correction's own instructions it's designed here and deferred, not half-built.

### Where it lives

A quiet secondary entry point on Sites, **not a second prominent button**: below the primary "Add your first constraint" CTA in the empty state (or near the populated header's `+`), a plain ghost text link — *"or start from a preset"*. This deliberately does not compete with the single-CTA rule just fixed elsewhere in this document (§10) — one thing draws the eye, the second path is present but quiet.

### The flow reuses the focused-flow shell, not a new one

Every step below (gallery, review-and-edit, behavior choice, confirm) is a screen using the exact same shell Add/Edit Constraint already established (§8, §11): persistent header and bottom navigation hidden, a focused header with a back arrow, full popup body, one natural scroll, no card. The "behavior choice" step is literally the same `ConstraintFormScreen`'s behavior accordion, applied to a batch instead of one domain, not a rebuilt picker. This is the entire point of building the focused-flow shell as reusable state rather than a one-off for Add Constraint: Presets is a sequence of screens using that same mechanism, not a reason to invent a second one.

Exactly the sequence in the brief, with nothing skipped:

1. **Presets** entry point → a gallery of named presets, each with a one-line description (not their domains yet — the gallery itself stays as compact and scannable as the behavior picker):
   - **Social Media** — "Pause before opening social apps."
   - **Video & Entertainment** — "Pause before streaming and video sites."
   - **News** — "Pause before news sites."
   - **Shopping** — "Pause before shopping sites."
   - **Adult Content** — "Add private constraints for common adult sites." (see below — this one is deliberately worded differently from the other four)
2. **Selecting a preset shows its included sites**, each pre-checked, individually removable, with an "Add a site" affordance to include one the curated list missed. Nothing is created yet.
3. **One behavior choice applies to the whole batch** — the same compact V2 accordion component from §11, reused rather than rebuilt, not a per-site choice (the point of a preset is speed).
4. **A confirm screen states plainly what's about to happen** — *"This will create 5 constraints with Checkpoint."* — before anything is written. A preset must never silently create constraints; this step is not optional.
5. **Create.** The N constraints are written in one batch, then the user lands back on Sites seeing the result.

### Example site lists — illustrative, not final

| Preset | Example sites |
|---|---|
| Social Media | facebook.com, instagram.com, tiktok.com, x.com, youtube.com |
| Video & Entertainment | (to be curated — YouTube arguably belongs here as much as under Social Media; needs one owner's judgment, not two overlapping guesses) |
| News | (to be curated) |
| Shopping | (to be curated) |
| Adult Content | (deliberately not enumerated in this document — see below) |

These are **examples to design against, not a committed hardcoded list to ship without review.** Whoever builds this should treat the actual final domain lists as a real content decision (they'll age, they'll need regional judgment calls, some services move categories), not something this document freezes in place.

### The Adult Content preset, specifically

This one needs more care than the other four, and is worded differently on purpose:

- **Label:** "Adult Content." **Supporting text, visible in the gallery before it's even selected:** *"Add private constraints for common adult sites."* — the private-by-default behavior is disclosed at the point of choosing, not discovered later.
- **Explicit, unhedged limitation, shown on the preset itself:** this does not claim to block "all adult content" or "all pornography." A curated domain list can only ever cover known, common, named sites — it is not content classification, not a filter, and not comprehensive. State this plainly in the preset's own description, not just in a design document nobody using the product will read.
- **Constraints created from this preset default to `isPrivate: true`.** The other four presets default to `false` (there's nothing sensitive about pausing before checking the news). The user can still uncheck privacy for an individual site during the review step (§1's user-remains-in-control principle applies here too) — but the default is private, and changing that is a deliberate action, not the path of least resistance.
- **The review step (step 2 above) necessarily shows real domains in plaintext** — the brief requires the user be able to review and remove entries, which is impossible without seeing what they are. This is a deliberate, momentary, user-initiated exposure during an active setup flow the user just chose to start, categorically different from a domain leaking into a screen the user is casually glancing at. Once the constraints are created, they immediately fall under the same masking as any other private constraint (§26) — nothing about being preset-sourced changes that.
- **Opening this specific preset's review screen should itself request the Boomrng PIN first, if one is configured** — treated the same as any other private-constraint reveal moment (§26), not a new mechanism. If no PIN is configured, use the same disclosed-but-not-blocking pattern already established for the private-constraint toggle elsewhere in this document (§26's "no PIN set" warning) rather than inventing a harder gate that's inconsistent with how privacy works everywhere else in the product.
- **No new privacy model.** Once created, a constraint from this preset is an ordinary private constraint — same masking on Dashboard and Sites, same reveal-with-PIN flow, same export/import policy (§26). The preset is a faster on-ramp to a constraint that already has a fully documented privacy story; it doesn't need its own.

### Documented privacy implications, summarized

The feature that needs the most care here isn't the mechanics of batch-creation — it's making sure the one preset dealing with sensitive content (a) says what it actually does and doesn't do, (b) defaults to the protection its own category implies, and (c) never treats "the user is actively setting this up right now" as equivalent to "it's fine to show this domain casually later." All three are addressed above; none of them should be re-litigated ad hoc when this actually gets built.

---

## Final Review

**1. What parts of this design are most distinctive to Boomrng?**
The closing-arc Delay ring, the friction-ordered compact behavior accordion, the corrected Checkpoint button hierarchy paired with the personal-reason quoting, and — as of this revision — Private Constraints, a general-purpose privacy feature no competitor referenced in the audit (One Sec, Freedom, LeechBlock, Opal) offers at all. *(Note: the live-preview-in-creation idea mentioned in earlier drafts of this answer has since been cut from the production flow, §11 — it's no longer a shipping asset to defend.)*

**2. What parts still risk feeling like generic SaaS/productivity UI?**
The Dashboard's summary-card-plus-list layout, the Settings page's sectioned-groups pattern, and the toast/empty-state components are all close to what any modern dark-mode app does. That's an honest limitation, not a flaw to hide — a browser-action popup has a genuinely small surface area, and not every screen needs (or can support) a distinctive treatment without becoming precious. The distinctiveness budget was spent deliberately on Checkpoint, Delay, and the behavior picker, because those are the moments the product is actually about.

**3. What would you remove if scope had to shrink by 25%?**
The live preview inside the creation flow, previously first on this list, is now moot — it's already been cut from production (§11) after rendering showed it cost more popup height than it earned. With that already done, the next cuts in order: (1) the `ProgressArc` motion polish — ship a simple static ring or even a linear bar for Delay initially, upgrade to the animated arc later. (2) The custom icon set — ship with a minimal single-color placeholder set (even simple geometric shapes) and refine art direction after the interaction changes are proven. (3) The onboarding empty-state copy iteration — ship whatever default string exists and refine wording later. (4) The export-time "include private constraints" opt-in UI (§26) — default-excluding private constraints from export is the safe behavior on its own; the explicit opt-in checkbox and warning copy can follow in a fast-second pass without leaving a privacy gap in the meantime.

**4. What would you absolutely refuse to cut?**
Fixing Checkpoint's button hierarchy, making Delay honor its configured duration, building a real Dashboard, and cutting the four non-functional behaviors down to the four that work. These are the difference between "a redesign" and "a redesign that's still lying to the user about what it does" — everything else in this document is refinement on top of that floor.

**5. Is this genuinely different enough from the current version to deserve "V2"?**
Yes, conditionally: yes if the button-hierarchy fix, the real Dashboard, the four-card behavior picker, and the closing Delay ring all ship. No, if only the color tokens and spacing scale ship without those interaction changes — that would in fact be exactly the "V1 with cleaner CSS" outcome this document was asked to avoid. The visual system in §§4–7 is necessary but not sufficient; the product-experience changes in §§9–16 are what actually earn the version number.

**6. What are the three riskiest UX assumptions?**
(a) That four friction-ordered option cards genuinely read faster and clearer than a dropdown for a first-time user — plausible, not proven, and worth a quick manual check before committing. (b) That removing Progressive Delay, Scheduled, Reflection, and Custom Message won't upset anyone who already configured a constraint using one of them, even though those behaviors don't currently do anything — the *feature* not working doesn't mean the *setting* being silently changed on upgrade won't feel like data loss. (c) That an arc closing over time communicates "time remaining" as unambiguously as digits — arcs are elegant but are a genuinely less universally legible time representation than a countdown, and this is the one visual decision in the document most likely to need reconsideration after actually looking at it on screen.

**7. Which decisions should be validated manually before implementation?**
Build the `ProgressArc` at actual enforcement-page size first and look at it for real before committing to it over a simple linear bar — legibility at a glance is the entire point of a Delay indicator, and prose can't settle that. Build both the `Modal` and `SlidePanel` treatments for Add Constraint in the real 360px popup and compare directly, rather than trusting the reasoning in §11 alone. And write the actual migration step for any existing installs with constraints on a removed behavior (silently remap to Checkpoint on load, most likely) and confirm it doesn't surprise anyone with real saved data before shipping Phase 4 of the audit's roadmap.
