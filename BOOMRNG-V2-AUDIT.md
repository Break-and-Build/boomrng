# Boomrng V2 — Full Product, UX, UI, Brand & Engineering Audit

> This document is based on direct inspection of the code in this repository as of the current working tree (branch `main`, including uncommitted changes), not on the aspirational planning documents already present in the repo (`REDESIGN-PLAN.md`, `DESIGN-SYSTEM.md`, `COMPONENT-ARCHITECTURE.md`, `ENGINEERING-ARCHITECTURE.md`). Those documents describe a fully-realized, React-everywhere, eight-behavior constraint engine. **The actual code does not match that description in several important ways**, and this audit calls those gaps out explicitly, with file citations, because the request was to trust the code over the docs.
>
> No implementation was performed as part of this audit. This is analysis and direction only.

---

## 0. Executive Summary

Boomrng is mid-transformation. `package.json` already declares `"version": "2.0.0"` and describes itself as a "Behavioral constraint system for intentional browsing" — the V1 identity (`README.md`: "Behavioral constraint system for knowledge workers... blocks distracting sites and limits your open tabs") is being replaced in place. A prior commit (`e457970 feat: complete Milestone 1 foundation`) laid down a React popup, a typed data model, and a component library. The working tree on top of that commit is mid-refactor of `Settings.tsx`, `Sites.tsx`, `rules-builder.ts`, and `service-worker.ts`.

What exists today is **architecturally sound in its foundations** (Manifest V3, `declarativeNetRequest`, a clean storage layer, a real focus-trapping Modal, coalesced rule refreshes) but **functionally hollow in its differentiators**. The product's own strategy documents claim an eight-behavior "Constraint Behavior System" as Boomrng's defining feature. In the actual code:

- **Delay ignores the user's configured delay entirely.** `delay.ts` hardcodes `DELAY_SECONDS = 30`, full stop. The minutes a user enters in the constraint form (1–120) are validated, saved, and then never read again.
- **Progressive Delay never progresses.** The `ProgressiveDelayState` schema exists; nothing in the codebase ever writes to it. Selecting "Progressive Delay" behaves identically to the broken 30-second Delay.
- **Scheduled has no schedule.** There is no time/day picker in the constraint form. Every new constraint is created with `schedule: null` (`Sites.tsx:36`), and the redirect rule for a "scheduled" constraint is unconditional — it blocks permanently, at all hours, which is the opposite of what the label promises.
- **Custom Message never shows the message.** The text a user types is saved to `constraint.customMessage` and then discarded — the redirect URL that `rules-builder.ts` builds never includes it, and the checkpoint page it redirects to never reads it.
- **Reflection is Checkpoint with a different name.** Both route to the same page with no distinguishing wait period.

So of eight advertised behaviors, effectively **three work as described** (Checkpoint, Hard Block, PIN Required), one is **broken in a way that defeats its purpose** (Delay), and four are **UI facades with no enforcement behind them** (Progressive Delay, Scheduled, Reflection, Custom Message). This is the single most important finding in this audit: the product's stated differentiator is currently more marketing copy than working software.

On top of that, the Checkpoint page — the interaction every planning document calls Boomrng's "signature interaction" — has its two buttons **inverted from the intended philosophy**: the prominent, primary-styled button is "Continue to site" (the distraction), and "Go back" is the secondary, muted one (`checkpoint/index.html:16-17`). Every strategy doc insists the reverse: the button that returns you to work should be the one drawing the eye.

The Dashboard — the screen every planning document treats as the product's five-second front door — is currently a literal stub: one heading and one line of grey placeholder text (`Dashboard.tsx`, 12 lines total).

None of this is a reason to panic or to throw the codebase away. The plumbing underneath — storage, messaging, DNR rule generation, the Modal's focus trap, the React component scaffolding — is genuinely well-built and worth keeping. V2's job is to stop adding surface area and finish wiring what's already been designed, while cutting the behaviors that don't earn their complexity.

---

## 1. Understanding the Current Product

### 1.1 What problem it currently solves

Boomrng blocks configured websites via Chrome's `declarativeNetRequest` API and redirects the browser tab to a local "enforcement page" instead of the requested site. It also caps the number of open tabs and redirects over-budget tabs to a tab-limit page. Optionally, a 4–6 digit PIN gates settings changes and PIN-required sites.

### 1.2 Likely user

Someone who self-identifies as easily distracted by specific sites (social media, video, forums) and wants a friction layer between "I want to open X" and actually loading it — not a parent installing content controls for a child, not an IT admin deploying policy. The `<all_urls>` host permission plus fully local storage (`PRIVACY.md`) signal a single-user, self-imposed-constraint tool, not a managed/enterprise product.

### 1.3 Current user journeys (as implemented)

1. **Install → open popup** → lands on Dashboard (currently blank/stub) → Bottom nav to Sites or Settings.
2. **Add a constraint**: Sites screen → "Add Constraint" → modal with `ConstraintForm` (domain, behavior dropdown, conditionally delay-minutes or custom-message textarea) → saved to `chrome.storage.local` under `constraints`.
3. **Storage change fires `chrome.storage.onChanged`** in the background worker → `refreshEnforcementRules()` regenerates all DNR rules from scratch and swaps them in.
4. **User visits a constrained domain** → DNR rule matches → browser is redirected (network-level, before any request is sent) to `chrome-extension://<id>/dist/src/enforcement/<page>/index.html?domain=...&behavior=...`.
5. **Enforcement page loads** (plain HTML + a small vanilla-TS script, *not* React) → shows domain, offers "Continue to site" / "Go back" (or PIN entry, or a countdown, depending on page).
6. **User acts** → either `window.history.back()` or navigation to `https://${domain}` (root only — see §15).
7. **Tab budget**: `chrome.tabs.onCreated`/`onUpdated` fires → `enforceTabLimit()` checks tab count against `settings.tabBudget` → over budget → active tab redirected to the tab-budget page, which offers only a "Try again" button.

### 1.4 Current screens

- **Popup**: Dashboard (stub), Sites (functional CRUD), Settings (PIN, Strict Mode toggle, Tab Budget number, Import/Export). Three-tab bottom nav (`BottomNavigation.tsx`), matching the "3 screens" conclusion in `REDESIGN-PLAN.md` — this part of the redesign plan has already been adopted.
- **Enforcement pages** (separate HTML entry points, not part of the popup bundle): Checkpoint, Delay, Block (hard-block), PIN, Tab Budget. Five HTML files, five matching vanilla-TS scripts.
- **Legacy**: `legacy/popup.html` (334 lines) and `legacy/limit.html` (54 lines) — the pre-rewrite V1 UI, kept in the repo but not built or referenced by `vite.config.ts` or `manifest.json`. Dead weight that should be deleted once V2 ships, not maintained.

### 1.5 Current constraint creation & persistence

`ConstraintForm.tsx` collects domain + behavior (+ delay minutes or custom message, conditionally rendered). `validateConstraint()` in `validation-service.ts` checks domain format, delay range (1–120), and message length. On submit, `Sites.tsx` builds a full `Constraint` object client-side (including `id: crypto.randomUUID()`, `schedule: null`, `progressiveDelay: null`, `enforcedToday: 0`) and calls `setConstraints([...constraints, newConstraint])`, which the `useConstraints` hook persists via `saveConstraints()` → `chrome.storage.local.set`.

There is no server, no sync, no encryption layer — this matches the stated privacy positioning and is appropriate for the product.

### 1.6 How browser interception actually works

`rules-builder.ts` → `generateRules()` converts each constraint into a `declarativeNetRequest` **REDIRECT** rule (priority 1) with a `urlFilter` anchored via the `||domain` adblock-style syntax (correctly matches subdomains). Allowed sites become **ALLOW** rules at priority 2, which correctly take precedence over blocks. This is solid, idiomatic DNR usage — no complaints here.

Critically, the redirect target embeds only `domain` and `behavior` in the query string (`rules-builder.ts:96`) — never the constraint's schedule, delay minutes, or custom message, and never the specific path/query the user was trying to reach. This single line is the root cause of most of the "known problems" investigated in §15.

### 1.7 Enforcement pages: how they're actually built

Every enforcement page is a static `index.html` + a small `.ts` file that does `document.getElementById(...)` and attaches `addEventListener`. There is no React here, no shared component, no design-system tokens consumed — `enforcement/shared/enforcement.css` hand-rolls its own copy of the color palette (`--bg: #003934`, `--accent: #00B242`, etc.) that duplicates but does not import `popup/styles/tokens.css`. This directly contradicts `ENGINEERING-ARCHITECTURE.md`'s diagram, which labels these "React Apps." **Trust the code**: they are not.

### 1.8 Continuing/bypassing a constraint

`goBackToOriginal()` (`enforcement/shared/utils.ts:33`) reads an `original` query param if present, else falls back to `https://${domain}` (bare root), else `window.history.back()`. Since `rules-builder.ts` never sets `original`, every "Continue" action lands on the domain's homepage, never the actual page the user was trying to reach.

### 1.9 Settings

Currently exposes: PIN set/clear (inline, no confirm field), Strict Mode toggle (writes `settings.strictMode` but **nothing reads it** — see §15), Tab Budget number input, Export/Import (functional, validates on import). Landing Page, Max Overrides Per Day, and Require-PIN-After exist in the `Settings` type and defaults but have **zero UI** and **zero consuming logic** anywhere in the codebase.

### 1.10 Import/export

Genuinely functional. `export-service.ts` serializes `{version, exportedAt, settings, constraints}` to a downloaded JSON file; `importData()` validates every constraint with `validateConstraint()` before committing. This is one of the more complete, low-risk features in the codebase.

### 1.11 Strict Mode

Toggle exists in `Settings.tsx` and persists to storage. **No code path anywhere reads `settings.strictMode`** — not in `rules-builder.ts`, not in `service-worker.ts`, not in any enforcement page. Flipping the toggle currently does nothing. This is a completed-looking feature that is entirely inert.

### 1.12 Tab Budget

The one genuinely complete, working system beyond core blocking. Badge color-codes by proximity to budget (`service-worker.ts:61-80`, green/orange/red — matches the design docs' intent), `enforceTabLimit()` correctly excludes enforcement pages from triggering themselves, and the popup's `useTabCount` hook independently recomputes for live display. Its enforcement page, however, is the weakest of the five (see §15).

### 1.13 Feature completeness matrix

| Feature | State |
|---|---|
| Hard Block | **Complete** |
| Checkpoint | **Complete**, but button hierarchy inverted (§15) |
| PIN Required | **Complete** enforcement path; setup UX is minimal (no confirm field) |
| Delay | **Broken** — hardcoded 30s, ignores configured minutes |
| Progressive Delay | **Placeholder** — schema only, never executes |
| Scheduled | **Placeholder** — no UI, always blocks regardless of time |
| Custom Message | **Placeholder** — message captured, never displayed |
| Reflection | **Placeholder** — indistinguishable from Checkpoint |
| Strict Mode | **Placeholder** — toggle persists, nothing consumes it |
| Tab Budget enforcement | **Complete** |
| Tab Budget page (close-tabs UX) | **Minimal** — no tab list, no one-click close |
| Import/Export | **Complete** |
| Dashboard | **Not implemented** (stub) |
| Onboarding | **Not implemented** |
| Max overrides / require-PIN-after | **Dead schema**, no UI, no logic |
| Landing Page redirect | **Dead schema**, no UI, no logic |
| Enforcement records / override sessions | **Dead schema**, storage keys reserved, never written |
| Tests | **None exist** despite `vitest` wired into `package.json` |
| Lint | **Non-functional** — no `.eslintrc*` or `eslint.config.*` despite `eslint` in devDependencies and an `npm run lint` script |

---

## 2. UX Audit

**Installation → first launch**: No onboarding of any kind. A fresh install opens the popup to a blank Dashboard and an empty Sites list. There is no explanation of what a "constraint" or "behavior" is anywhere in the product — the vocabulary is introduced with zero scaffolding. For a product whose central pitch is "behavioral friction," landing a new user in front of an undifferentiated dropdown of eight technical-sounding options (several of which don't work) is close to the worst possible first impression.

**Dashboard**: Currently nothing to evaluate — it's a stub. By omission, this is itself the single largest UX problem: the screen every planning document calls the five-second front door shows nothing.

**Sites**: Functional and reasonably clear — list, add, edit, delete, with a real empty state and a real delete-confirmation dialog. The behavior dropdown, however, presents eight options with no visible distinction between "this really changes what happens" (Delay, Hard Block, PIN) and "this currently does nothing" (Scheduled, Reflection, Custom Message, Progressive Delay) — the UI has no way to communicate that four of its eight choices are not load-bearing.

**Creating a constraint**: The form is minimal and clean, but behavior selection happens with only a one-line description (`formatBehaviorDescription`) and no live preview of what the enforcement page will look like — for a differentiator this central, that's a missed moment of delight per the "signature interaction" idea in the redesign plan.

**Checkpoint experience**: Calm, non-judgmental copy ("Take a moment to consider. Is this intentional?") — this part lands well and matches the desired emotional tone. But the button hierarchy actively works against the product's philosophy (§0, §15) — the prominent button pulls you toward the distraction.

**Delay experience**: Shows a live countdown and progress bar, which is polished UI work — undermined by the fact that the number it counts down from is never the number the user configured.

**Hard Block**: Simple, calm, one button. No complaints — this is close to right already, if slightly terse ("You've chosen to restrict access" reads a little more clinical/passive than the rest of the copy).

**PIN experience**: Functional at the enforcement-page level (masked input, error state, Enter-to-submit). At the Settings level, setting a PIN has no confirmation field — a typo silently locks the user out of their own override with no way to know until they try to use it.

**Tab Budget**: The badge and popup-level tab count are good ambient signals. The actual over-budget page is the weakest enforcement experience — it tells you to close tabs but doesn't show you which tabs, doesn't offer to close any for you, and a "Try again" click that doesn't first close a tab silently loops back to the same page.

**Settings**: Reasonably organized into Security / Enforcement / Data sections. The presence of a Strict Mode toggle that does nothing is a trust problem waiting to happen — a user who enables it and later gets blocked exactly the same as before it was on will lose confidence in the product's honesty.

**Errors / Loading**: Both hooks (`useConstraints`, `useSettings`) expose an `isLoading` boolean and both screens render a spinner while loading — consistent and fine. Error handling is thin: `Settings.tsx`'s `catch` blocks show a generic toast ("Failed to export settings") with no detail, and there's no `ErrorBoundary` wired at the `App` root (one exists at `components/feedback/ErrorBoundary/` but is unused by `App.tsx` — dead code, or an unfinished wiring step).

**Navigation**: Three bottom tabs, correctly using `aria-current="page"` and `role="navigation"` — solid baseline accessibility here.

**Keyboard usage**: The `Modal` component (§14) has genuinely correct focus-trap and focus-restore behavior — better than most extension popups bother with. Enforcement pages support Enter-to-submit on the PIN field but have no visible focus-management strategy (no explicit initial focus, no Escape-to-go-back).

**Is the product immediately understandable?** No — not in its current state. The mental model ("constraints" + "behaviors") is a reasonable one, but half the behaviors are inert, the Dashboard doesn't summarize anything, and there's no onboarding to introduce any of it.

**Does Boomrng help users make intentional decisions, or merely block them?** As built today: it merely blocks. The "intentional decision" framing lives entirely in the planning documents and in the Checkpoint's copy — the actual interaction (inverted button hierarchy, no reflection step, no "why are you here" moment) doesn't yet deliver on it.

---

## 3. UI Audit

**Colors**: A consistent dark-teal/green identity runs through both the popup (`tokens.css`) and the enforcement pages (`enforcement.css`) — but as **two independently hand-written copies** of nearly the same palette, already drifting (popup tokens.css has no `--warning`/`--error` semantic tokens at all; enforcement.css does). This is a real, current inconsistency, not a hypothetical one.

**Typography**: System font stack throughout — good, matches the "not Courier New everywhere" intent already. No monospace is actually used anywhere for domains/timers in the *current* popup CSS, despite both design docs insisting on it; the enforcement pages do use `SF Mono` for the domain chip, so the two surfaces disagree with each other stylistically.

**Spacing/Layout**: Ad hoc — `Dashboard.tsx` inlines `style={{ padding: '16px' }}` directly in JSX rather than using the CSS-module + token system every other screen uses. Inconsistent by omission, not by decision.

**Cards, buttons, forms**: The foundation components (`Button`, `Input`, `Modal`) are reasonably built as real, reusable primitives — this is good bones. `ConstraintCard` is minimal (domain + badge + Edit/Delete) and doesn't yet show status (delayed, expires-in, etc.) the way the design docs intend.

**Enforcement pages' visual density**: Fine — calm, centered, single-column, no clutter. The icon choice (emoji-adjacent Unicode glyphs like ◉, ⏳, ✕, 🔑) is a stylistic placeholder, not a considered icon system — worth replacing with a small custom SVG set for V2, since it currently reads as unfinished rather than minimal.

**Popup proportions**: Not explicitly set anywhere (`AppShell` mentioned in the docs doesn't exist in the actual code) — the popup's width/height is left to the browser's defaults and whatever CSS `App.module.css` happens to apply, rather than being deliberately designed as the docs specify (340px × up to 580px).

**Motion**: Present in CSS transitions on hover states but not verified end-to-end (no `prefers-reduced-motion` guard found anywhere in the actual stylesheets — this exists only in the planning docs).

**Overall verdict**: The UI is closer to a well-organized internal tool than a premium consumer product. It is not embarrassing, but it is not yet "meaningfully different," and several surfaces (Dashboard, enforcement icons, cross-surface token consistency) need real design work, not polish.

---

## 4. Color System — V2 Palette

The dark-teal-and-green identity is worth keeping — it's distinctive (most focus tools default to blue or purple), it reads as calm rather than alarming, and it's already load-bearing across two independently-built surfaces. The problem isn't the hue family; it's that it exists as **two divergent, hand-rolled token sets** with no shared source of truth. V2 should keep the identity and unify the tokens.

### Proposed V2 tokens

```css
:root {
  /* Brand */
  --brand-950: #04211D;   /* deepest surface — enforcement page background */
  --brand-900: #0A2E27;   /* popup background */
  --brand-800: #0D3B31;   /* raised surfaces, cards */
  --brand-700: #145A46;   /* borders, dividers */
  --brand-500: #1E9160;   /* hover/active borders, focus rings (secondary) */
  --brand-400: #22B36B;   /* primary accent — buttons, active state, links */
  --brand-300: #4FCB8B;   /* hover state for accent */

  /* Neutrals (new — the current system has almost none) */
  --neutral-0:  #FFFFFF;
  --neutral-100:#E7ECEA;  /* primary text on dark */
  --neutral-300:#9FB0AA;  /* secondary text */
  --neutral-500:#6C7C77;  /* tertiary text, placeholders */
  --neutral-700:#3A4842;  /* disabled borders */

  /* Semantic (role-named, not brand-named — fixes the popup/enforcement drift) */
  --semantic-positive: #22B36B;  /* = brand-400. Active, within budget, success. */
  --semantic-caution:  #E8A33D;  /* Delay in progress, approaching tab budget. */
  --semantic-critical: #E5484D;  /* Hard block, over budget, invalid input. */
  --semantic-info:     #4B9FE1;  /* PIN required, neutral status. */

  /* Surfaces */
  --surface-canvas:  var(--brand-900);
  --surface-raised:  var(--brand-800);
  --surface-overlay: rgba(4, 33, 29, 0.72);
}
```

**Why each color belongs:**

- **`--brand-400` (#22B36B)** is the identity color — it's what "Boomrng green" already means to anyone who's used the extension. Keep it as the single accent, used *only* for the action that advances the user's actual intent (returning to work, applying a constraint) — never decoratively.
- **The neutral ramp is new and necessary.** Neither current token file defines a real neutral scale; both fake it with `rgba(255,255,255,0.4)`-style opacity hacks (`tokens.css:8-9`). Opacity-based "neutrals" shift meaning depending on what's behind them and fail contrast audits unpredictably. A fixed neutral ramp fixes both problems and is a one-file change with no visual regression risk.
- **Semantic tokens are named by role, not by hex-adjacent brand name**, specifically so that popup and enforcement CSS can both import the *same* token file (`tokens.css`) instead of maintaining two copies that will keep drifting. This is the actual fix for the divergence documented in §3 — not a new palette, a single source of truth.
- **Caution/critical hues are unchanged from the existing values** (`#F5A623`→`#E8A33D`, `#D32F2F`→`#E5484D`) — nudged slightly for better contrast against the darker `--brand-900` background, not replaced. Users who already associate orange-approaching/red-over with the tab budget badge keep that association.

**Dark-mode-only, deliberately.** Boomrng is a focus tool used in short bursts against a browser chrome that's usually already dark or neutral; the existing REDESIGN-PLAN.md explicitly deprioritized light mode ("nice-to-have, not essential") and this audit agrees — building a second palette is real cost for a feature no planning document argues anyone asked for. If light mode is ever pursued, treat it as a "V2 Later" item, not a blocker.

---

## 5. Branding Audit

**Name**: "Boomrng" (stylized without vowels) is distinctive and ownable, and the boomerang metaphor — leaving an intended path and being gently returned to it — is a genuinely good fit *if* it's used as a feeling, not a literal UI motif. Do not build a boomerang-shaped icon or animate things flying back and forth; that reads as gimmicky for a tool whose actual selling point is calm restraint. Let the metaphor live in copy and in the shape of the interaction (you leave, you're returned, gently) rather than in illustration.

**Current icon**: `images/icon-{16,48,128}.png` plus a separate `images/boomrng-icon.svg` — worth a fresh pass as part of V2, since the current icon predates the "calm, opinionated, premium" positioning being aimed for and was not evaluated as part of this text-only audit (icon design needs visual iteration, not a document).

**Personality it should communicate**: intentional, calm, quietly confident — a tool that has an opinion but doesn't lecture. The existing Checkpoint copy ("Take a moment to consider. Is this intentional?") already nails this tone in isolation; the job for V2 is to make every other surface (Settings copy, empty states, error messages) match that same register, since right now they don't ("PIN cleared" / "Import failed" toasts are functional but generic, not distinctly Boomrng).

**What it should not feel like**: parental, corporate, preachy, guilt-driven, gamified. The current codebase has no gamification anywhere (no streaks, no scores) — this is a genuine asset already in place, and worth explicitly protecting during V2 rather than assuming it stays cut once new engineers or features are added.

**Terminology**: The code currently uses "constraint," "behavior," and "domain" consistently — matches the philosophy. "Strict Mode," "Tab Budget," and "PIN Required" are all decent, ownable terms already in place. Recommend *not* adopting every renamed term from `REDESIGN-PLAN.md`'s glossary wholesale (e.g., "Quiet Period" for pause, "Landing Page" for redirect URL) until the underlying feature actually exists — renaming a feature that does nothing doesn't fix it.

---

## 6. Product Positioning

**What Boomrng actually is, based on the working code**: a domain-level browser blocker with one working friction mode (Checkpoint) and one working hard-block mode, wrapped in a tab-count limiter. That is a solid, real thing — closer to "an opinionated site blocker with a moment of pause built in" than to the eight-mode "behavioral constraint operating system" the planning docs describe.

**Positioning statement for V2**: *"Boomrng puts one honest pause between you and the site you're about to open — not eight settings, one moment."* This is deliberately narrower than the existing planning docs' ambition, because narrower is what the current codebase can actually deliver well, and because a product that does three things completely beats a product that advertises eight and delivers three.

**Core philosophy**: Every constraint should default to creating a decision point, not a wall. Hard Block should be the deliberate exception a user reaches for after Checkpoint hasn't worked for a specific site — not one of eight equally-weighted dropdown options.

---

## 7. Feature Audit

| Feature | Verdict | Why |
|---|---|---|
| Checkpoint | **KEEP**, fix button hierarchy | Works, has the right tone, is the actual differentiator once fixed (§9). |
| Hard Block | **KEEP** | Simple, works, needed as the deliberate escape hatch from Checkpoint. |
| PIN Required (site-gate) | **KEEP**, improve setup | Works end-to-end; needs a confirm-PIN field and a real settings entry point. |
| Delay | **REDESIGN** | Concept is sound (a timed pause is genuinely different from a binary block); implementation must actually read `delayMinutes` instead of a hardcoded constant. |
| Progressive Delay | **REMOVE** (for V2 Core), revisit as **V2 Later** | Currently 100% non-functional; escalating friction is a legitimate idea but needs its own small state machine, not a bolt-on to Delay. Don't ship a checkbox that lies. |
| Scheduled | **REMOVE** (for now) | No UI exists to configure it and the enforcement path ignores time entirely — shipping this as a selectable option today is actively deceptive to the user. Rebuild properly or cut it. |
| Custom Message | **MERGE into Checkpoint** | The idea ("remind yourself why you blocked this") is good; it doesn't need a whole separate behavior type — let Checkpoint optionally carry a user-authored one-line reason, and actually render it (which nothing does today). |
| Reflection | **REMOVE** | Indistinguishable from Checkpoint today; if revisited later, it needs an actual enforced wait period to justify existing as a separate mode. |
| Strict Mode | **REDESIGN** | The toggle exists and persists but nothing reads it — either wire it to actually escalate all behaviors to Hard Block (as originally intended), or remove the toggle until it does something. A dead toggle in Settings is worse than no toggle. |
| Tab Budget (limiter) | **KEEP** | Genuinely unique among lightweight blockers, fully functional, good badge UX. |
| Tab Budget enforcement page | **IMPROVE** | Needs an actual tab list with per-tab close buttons — "Try again" with nothing closed is a dead loop today. |
| Import/Export | **KEEP** | Complete, validated, low-risk. |
| Max Overrides / Require-PIN-After | **REMOVE** | Pure dead schema — no UI, no logic, no storage writes. Either build the override-tracking system for real or delete the fields; half-declared schema is worse than absence because it implies a promise. |
| Landing Page (redirect-to-somewhere-productive) | **REMOVE for now, reconsider for V2 Later** | Also dead schema. If reintroduced, it should be the *destination* of "Return to work," replacing the current `history.back()`/domain-root fallback — a real feature, not a settings field nobody reads. |
| Onboarding | **ADD (V2 Core)** | Currently doesn't exist at all; see §12. |
| Dashboard | **ADD (V2 Core, effectively from scratch)** | Currently a 12-line stub; see §11. |

**Principle applied**: every KEEP either already works end-to-end or needs a small, scoped fix. Every REMOVE is currently a facade — UI that implies working software behind it when there is none. Shipping fewer, working behaviors is a stronger, more honest product than shipping eight, five of which are theater.

---

## 8. Constraint Behavior System — What V2 Should Support

Cut from eight behaviors to **four**, each genuinely distinct and genuinely working:

1. **Checkpoint** (default) — a pause and a choice. The signature interaction (§9).
2. **Delay** — a real, configurable wait (the number the user typed actually counts down).
3. **PIN Required** — for sites the user wants friction against *themselves specifically*, not just habit.
4. **Hard Block** — the deliberate, no-appeal option for sites with no legitimate use case for this user.

This is a spectrum of increasing firmness (Checkpoint → Delay → PIN → Hard Block), which is a far simpler mental model for a user choosing a behavior than eight parallel, unranked dropdown options. The picker itself should present them in this order, as a spectrum with one-line consequences, not an alphabetized `<select>`.

Escalation (Progressive Delay's underlying idea) is worth its own future design pass as a *modifier on Delay* ("delay doubles each time you return within an hour") rather than a fifth top-level behavior competing for attention in the same list.

---

## 9. Redesigning the Checkpoint

The current implementation (`checkpoint/index.html`) has the right emotional register and the wrong mechanics. Concretely:

**Fix the button hierarchy.** Swap which action is primary:
- Primary (accent-filled, full-width): **"Back to what I was doing"** → returns the user to their previous context.
- Secondary (plain text, smaller, below): **"Continue anyway"** → loads the site.

This single change makes the interaction match every planning document's stated philosophy and matches how the equivalent interaction reads in `REDESIGN-PLAN.md` — the actual code just built it backwards.

**Fix destination fidelity.** `rules-builder.ts` should pass through the specific pending URL (path + query), not just the bare domain, so "Continue anyway" lands where the user was actually headed, and "Back to what I was doing" can use `history.back()` reliably instead of falling back to a domain root. This closes the gap identified in §15 for both the Checkpoint and Delay pages, since they share `goBackToOriginal()`.

**Add the one-line reason, optionally.** When creating a constraint, let the user write a one-line note to their future self ("I said I'd write, not scroll"). Show it on the Checkpoint page under the domain. This subsumes the "Custom Message" behavior (§7 MERGE) without needing a separate mode, separate validation, or a separate enforcement page.

**Keep it fast.** No countdown, no forced wait, no animation — the current implementation already gets this right by not adding any of it. Resist the urge to add a 3-second countdown "for effect"; a pause that's imposed rather than chosen isn't intentional, it's just another kind of block with extra steps.

**Should Checkpoint be the interaction other behaviors build from?** Yes for the mental model (§8's spectrum), but not literally in code — Delay, PIN, and Hard Block are each simple enough to stay as their own small, direct implementations rather than being expressed as "Checkpoint plus a modifier," which would reintroduce the kind of over-abstraction the current `ConstraintForm`'s single conditional-field approach already avoids reasonably well.

---

## 10. Information Architecture

Keep the three-screen structure already adopted (Dashboard / Sites / Settings) — this matches `REDESIGN-PLAN.md`'s own later revision (from 4 screens down to 3, cutting the "Focus" screen), and the code has already made this cut. Don't re-add a fourth screen; the current restraint here is correct and should be protected as new features get proposed.

The one architectural gap: **the popup currently cannot be understood in five seconds**, not because it has too many screens, but because the screen meant to carry that job (Dashboard) carries nothing. Fixing §11 fixes this section by itself — no navigation restructuring needed.

---

## 11. Dashboard Redesign

Replace the 12-line stub with a status view built from data that already exists in storage (no new schema required):

```
boomrng
─────────────────────────────
3 constraints active

twitter.com        checkpoint
youtube.com        hard block
reddit.com         delayed · 12m left

─────────────────────────────
Tabs: 7 of 10
[████████░░]
```

- **Active constraints list**, reusing `ConstraintCard`/`BehaviorBadge` already built for Sites, in read-only form — no new components required, just composition.
- **Tab budget**, reusing the same count `useTabCount()` already computes for the badge.
- **Nothing else.** No "6 constraints enforced today" (would need the currently-dead `enforcedToday` field wired up, which is a real but separate piece of work — don't block the Dashboard's first ship on it). No charts, no streaks, no historical view.

This is buildable almost entirely from hooks and components that already exist in the codebase (`useConstraints`, `useTabCount`, `ConstraintCard`, `BehaviorBadge`) — it is genuinely one of the cheapest, highest-impact items in the whole roadmap.

---

## 12. Onboarding

Currently zero. Minimum viable version, no tutorial screens:

1. First popup open with an empty constraint list already shows a real empty state (`EmptyState` component exists and is wired into `Sites.tsx`) — extend its copy from generic ("No constraints yet") to instructive: *"Add a site you want a pause before opening."*
2. First constraint created → **immediately show a live preview of the Checkpoint page** (can literally render the same enforcement HTML in an iframe or a static mock) so the user sees the consequence of what they just configured, rather than reading about it.
3. That's it. No multi-step wizard, no PIN-setup gate, no forced tour — per the product's own stated philosophy, the user should experience Boomrng, not read about it, and two touchpoints (a better empty state + a preview) achieve that without adding screens.

---

## 13. Emotional UX

The Checkpoint's existing copy is the best writing in the product today and should be the template for everything else, which currently doesn't match it:

| Context | Current copy | Recommended |
|---|---|---|
| Checkpoint | "Take a moment to consider. Is this intentional?" | Keep as-is. |
| Delay | "Please wait before continuing." | Keep, but only once the countdown is honest (§15). |
| Hard Block | "This site is blocked. You've chosen to restrict access." | "This site is blocked." — the second sentence over-explains and sounds slightly defensive; the fact alone is calmer. |
| PIN | "Enter your PIN to continue to this site." | Keep. |
| Tab Budget | "You've reached your tab limit. Close some tabs to continue." | Keep the tone; pair it with an actual tab list once built (§7). |
| Settings — PIN saved | "PIN saved" (toast) | "PIN protection active." — ties the action to its purpose, not just its mechanics. |
| Settings — import failure | "Invalid import file" | "That file doesn't look like a Boomrng export." — specific, not generic. |
| Empty constraints | "No constraints yet" / "Add your first constraint..." | Keep — already good. |

General rule already mostly followed and worth keeping explicit: no exclamation points, no emoji, state the fact, offer the action, stop.

---

## 14. Engineering Audit

**React architecture**: Reasonable. Screens are thin, hooks (`useConstraints`, `useSettings`, `useTabCount`) correctly encapsulate storage subscription + local state, and components are organized by domain (`constraints/`, `feedback/`, `foundation/`, `layout/`) rather than dumped flat. `Dashboard.tsx` being an unstyled stub is a completeness gap, not an architecture problem.

**TypeScript**: Types are defined once in `shared/types/` and imported consistently — no duplicated interfaces found across popup/background. Good discipline.

**Manifest V3 / service worker**: Correct shape — `background.service_worker` as an ES module, no persistent background page assumptions, listeners registered at top level (required for MV3 worker wake-up), `syncStateOnBoot()` called on both `onInstalled` and `onStartup` plus unconditionally at module load — this triple-coverage is slightly redundant but is a safe, defensible choice for a worker that can be evicted and restarted at any time.

**`declarativeNetRequest` usage**: The strongest part of the codebase. Correct rule priority for ALLOW vs REDIRECT, correct `||domain` anchoring for subdomain coverage, and `refreshEnforcementRules()`'s in-flight/queued coalescing (`service-worker.ts:126-144`) is a genuinely well-thought-out guard against redundant concurrent rewrites when multiple storage keys change in quick succession.

**Storage abstraction**: `storage-service.ts` is a clean, small, well-typed wrapper — default-merging (`{...DEFAULT_SETTINGS, ...stored}`) protects against partially-migrated settings objects, which is good defensive design even without a formal migration system in place yet.

**Messaging**: Minimal and adequate for the two message types actually in use (`VALIDATE_PIN`, `REQUEST_CONTINUE`). `messages.ts` declares several message types (`REFRESH_RULES`, `UPDATE_BADGE`, `GET_TAB_COUNT`, `SET_STRICT_MODE`, the whole `EnforcementMessage` union) that **no code sends or handles** — dead type surface left over from the more elaborate architecture doc. Low risk, but worth pruning so the type file reflects what's real.

**Enforcement pages**: Functionally fine as vanilla TS but architecturally inconsistent with the rest of the app — they don't share the popup's design tokens, component library, or build tooling conventions (they're plain DOM scripts while everything else is React). This isn't necessarily wrong (enforcement pages are simple enough not to need React), but it should be a **deliberate decision written down**, not an accidental gap between what the architecture docs describe and what got built.

**Domain matching**: `normalizeDomain()` is solid and consistently reused. `isDomainMatch()` in the same file is defined but never called anywhere in the codebase — dead code, likely superseded by DNR's own `||domain` matching, safe to delete.

**Security**: PIN stored in plaintext in `chrome.storage.local` — explicitly and correctly justified in the architecture doc's own reasoning (local-only extension storage, 4-6 digit convenience code, not a password) and this audit agrees no additional hashing is warranted; the complexity cost isn't worth it for a code whose entire threat model is "stop yourself, not an attacker." `<all_urls>` host permission is necessary for the core function and is disclosed accurately in `PRIVACY.md`.

**Tests**: **None exist.** `vitest` is a devDependency, `"test"` and `"test:run"` scripts are defined, and zero `*.test.*` files exist anywhere in the repo. Running `npm test` today would report zero tests, not a failure — silently misleading. `ConstraintEngine`-style pure logic doesn't even exist as a testable unit yet (the actual evaluation logic is inlined into `rules-builder.ts` and `service-worker.ts`), which is itself worth fixing before writing tests, not after.

**Lint**: **Non-functional.** `eslint` and `@typescript-eslint/*` are devDependencies, `"lint": "eslint src --ext .ts,.tsx"` is defined, and there is no `.eslintrc*` or `eslint.config.*` anywhere in the repo. Running `npm run lint` today would error immediately with "no configuration found," not silently pass. This should be one of the very first things fixed in V2 — it's cheap and it protects every subsequent change.

**Performance**: Non-issue at this scale — a popup with a handful of constraints and a background worker that only runs on storage/tab events. No premature-optimization concerns; explicitly do not add the caching layers described in `ENGINEERING-ARCHITECTURE.md` (evaluation caches, tab-count caches) until there's an actual measured problem.

**Technical debt, prioritized**:
1. No lint config (cheap, high-leverage, do first).
2. No tests (start with `normalizeDomain`, `generateRules`, and `validateConstraint` — pure functions, easy wins).
3. Dead schema (`OverrideSession`, `EnforcementRecord`, `maxOverridesPerDay`, `requirePinAfter`, `landingPage`) — either build or delete, don't leave half-declared.
4. Two divergent copies of the color tokens (popup vs. enforcement) — fix per §4.
5. `legacy/` directory — delete once V2 ships; it's not referenced by any build config today.

---

## 15. Known Problems — Investigated Against Current Code

| Reported problem | Current status | Root cause |
|---|---|---|
| Enforcement pages showing `unknown` instead of the domain | **Appears fixed** for the DNR-triggered flow. `rules-builder.ts:96` always includes `&domain=${domain}` in the redirect URL, and every enforcement script reads it via `getDomain()`. The `'unknown'` fallback string still exists in each script (e.g. `checkpoint.ts:10`) only as a defensive default if the param is ever missing — it should no longer trigger in normal use. | N/A — was likely a redirect-URL construction bug that's since been fixed by consistently including `domain`. |
| Checkpoint's Continue returning to a placeholder GitHub URL instead of the original destination | **Partially fixed, partially still broken.** The literal GitHub-placeholder symptom is gone — `goBackToOriginal()` now falls back to the real domain, not a hardcoded external URL. But it still doesn't return to the **actual** destination: it reconstructs only `https://${domain}` (bare root), discarding any path or query the user was originally headed to. | `rules-builder.ts:96` never captures or forwards the pending URL's full path/query — only the bare domain is known at redirect time. `getOriginalUrl()` (`enforcement/shared/utils.ts:6-14`) has an `original` param path ready to use, but nothing ever populates it. |
| Delay's Continue returning to GitHub | Same as above — fixed in the literal sense (no more GitHub), same underlying destination-fidelity gap remains, since `delay.ts` calls the identical `goBackToOriginal()`. | Same root cause as the Checkpoint row. |
| Delay countdown restarting when the enforcement page is refreshed | **Fixed.** `delay.ts:21-32` persists the countdown's `endTime` in `chrome.storage.local` keyed per-domain (`boomrng_delay_ends_${domain}`) and only creates a new one if none exists or the stored one has already expired. A page refresh re-reads the same `endTime` and resumes correctly. | N/A — this is solid, already-correct code. Worth calling out as something to keep, not just something that isn't broken. |
| PIN enforcement existing without an obvious PIN setup workflow | **Substantially addressed** by the in-progress `Settings.tsx` (currently uncommitted in the working tree). There is now an inline PIN field with Save/Clear, format validation, and a status hint ("PIN is set" / "No PIN set"). Remaining gap: no confirm-PIN field, so a typo when setting a PIN is undetectable until the user tries to use it and fails. | Was previously true; the current uncommitted work has closed most of the gap. Finish it with a confirmation field before considering it done. |

**New problems found during this audit, not on the original list** (see §0/§7/§8 for full detail): Delay ignores configured duration entirely (hardcoded 30s); Progressive Delay, Scheduled, Reflection, and Custom Message are non-functional; Strict Mode toggle has no effect; Checkpoint's button hierarchy is inverted from the product's stated philosophy; the Tab Budget page offers no way to identify or close specific tabs, making "Try again" a dead loop if the user hasn't manually closed something elsewhere.

---

## 16. Competitive Inspiration

**Learn from**:
- **Linear** — restraint in navigation (3 sections, no more) is already correctly adopted here; keep resisting the urge to add a 4th tab as features grow.
- **Raycast** — minimal chrome, text over icons where possible; the current bottom nav already does this reasonably (text labels present, icons are secondary).
- **Arc** — willingness to have an opinion (default behavior = Checkpoint, not a blank config screen) is the right instinct; the current `ConstraintForm` defaults to `'checkpoint'` already (`ConstraintForm.tsx:37`), which is correct and worth protecting as more behaviors are considered.

**Deliberately avoid**:
- **RescueTime / Opal-style analytics** — the codebase currently has zero tracking dashboards, zero historical charts; keep it that way. The `enforcedToday`/`EnforcementRecord` schema, if ever built out, should stay a single ambient number on the Dashboard, never a report.
- **One Sec's breathing exercises** — a forced-wait interaction without a clear exit is friction without agency; Boomrng's Checkpoint already avoids this by offering an immediate, respected choice rather than a mandatory pause, and that should stay non-negotiable even as Reflection/Delay get redesigned.
- **LeechBlock's configuration sprawl** — the current eight-behavior dropdown is already trending toward this; §7/§8's cut to four behaviors is a direct correction.

---

## 17. Boomrng V2 — Complete Direction

**Product**
- Positioning: *"One honest pause between you and the site you're about to open."*
- Target user: someone who wants friction against their own habits on 2–5 specific sites, not a comprehensive blocking policy.
- Differentiator: Checkpoint done right (real choice, correct button hierarchy, optional one-line reason) plus a Tab Budget that actually helps you close the right tabs.

**Brand**
- Personality: calm, quietly opinionated, not preachy.
- Palette: unified brand-green + real neutral ramp + semantic tokens (§4), single source of truth shared by popup and enforcement pages.
- Voice: factual, short, present-tense; the existing Checkpoint copy is the north star for everything else.

**UX**
- IA: Dashboard / Sites / Settings — already correct, don't add a fourth screen.
- Primary flow: add a constraint → see it live on Dashboard → hit the real Checkpoint → get pulled back to what you were doing (not pushed toward the distraction).
- Onboarding: a sharper empty state + an immediate live preview of Checkpoint, no wizard.

**UI**
- Popup: fill in the Dashboard for real (§11), otherwise largely keep current Sites/Settings structure.
- Enforcement pages: fix button hierarchy (§9), fix destination fidelity (§15), pull from shared tokens instead of a duplicated palette.
- Components: keep the existing foundation layer (`Button`, `Modal`, `Input`) — it's genuinely solid; extend rather than replace.

**Features**

| V2 Core | V2 Later | Remove |
|---|---|---|
| Checkpoint (fixed) | Progressive Delay (as a Delay modifier, redesigned) | Scheduled (as currently non-functional) |
| Delay (fixed to honor configured minutes) | Landing Page redirect (real feature, not dead schema) | Reflection |
| Hard Block | Override-count tracking (`maxOverridesPerDay`, real this time) | Custom Message as its own behavior (merge into Checkpoint) |
| PIN Required (+ confirm field) | Light mode | Strict Mode toggle (until rebuilt to actually do something) |
| Tab Budget + real close-tabs UI | | Dead `EnforcementRecord`/`OverrideSession` schema (delete or build) |
| Dashboard (real) | | `legacy/` directory |
| Minimal onboarding | | |
| Working lint + basic unit tests | | |

---

## 18. Prioritized Revamp Roadmap (single developer)

**Phase 1 — Foundation cleanup** (2–3 days)
- Objective: make the toolchain trustworthy before touching product code.
- User outcome: none directly, but every subsequent phase becomes safer.
- Changes: add `eslint.config.js` (flat config, matching existing TS/React stack); write first unit tests for `normalizeDomain`, `generateRules`, `validateConstraint`; delete `legacy/`; delete dead schema (`OverrideSession`, `EnforcementRecord`, `maxOverridesPerDay`, `requirePinAfter`, `landingPage`) or explicitly flag them `@deprecated` if keeping for Phase 6.
- Dependencies: none.
- Risks: low — this phase touches no user-facing behavior.

**Phase 2 — Unify design tokens** (1–2 days)
- Objective: single source of truth for color/spacing across popup and enforcement pages (§4).
- User outcome: enforcement pages visually match the popup exactly; no user-visible functional change.
- Changes: new shared `tokens.css`, imported by both `popup/styles/` and `enforcement/shared/`; remove the duplicated hand-rolled palette in `enforcement.css`.
- Dependencies: Phase 1 (so the resulting CSS is lint-clean, if CSS linting is added).
- Risks: low — purely visual; verify against both light-on-dark contrast ratios before shipping.

**Phase 3 — Fix Checkpoint & Delay** (3–4 days)
- Objective: make the product's two working differentiators actually correct.
- User outcome: Checkpoint's primary button pulls you back to work, not toward the distraction; Delay counts down the number you actually configured; "Continue"/"Go back" land on the real destination.
- Changes: swap button primary/secondary in `checkpoint/index.html`; thread the real pending URL (path+query) through `rules-builder.ts`'s redirect URL as an `original` param; read `constraint.delayMinutes` in `delay.ts` instead of the hardcoded `30`.
- Dependencies: Phase 2 (so the fixed pages ship with correct tokens, not a second re-skin later).
- Risks: medium — DNR redirect rules have URL-length practical limits; test with a realistically long pending URL before shipping.

**Phase 4 — Cut the non-functional behaviors** (1 day)
- Objective: stop advertising behaviors that don't work (§7/§8).
- User outcome: the behavior picker shows four options, all of which actually do what they say.
- Changes: remove Scheduled/Reflection/Progressive-Delay/Custom-Message-as-behavior from `ConstraintForm`'s `BEHAVIORS` list and from `rules-builder.ts`'s `getBehaviorPagePath`; migrate any existing user constraints on removed behaviors to Checkpoint on load (one small migration function).
- Dependencies: Phase 3 (Checkpoint needs to support the merged "optional reason" first, so Custom-Message users don't just lose their notes).
- Risks: medium — this is the one user-visible *removal*; needs a one-time migration path for existing installs, not a silent data drop.

**Phase 5 — Build the real Dashboard** (2–3 days)
- Objective: give the popup an actual five-second front door (§11).
- User outcome: opening the popup immediately shows what's active and how many tabs are left, using components that already exist.
- Changes: replace `Dashboard.tsx`'s stub body with `ConstraintCard`/`BehaviorBadge` (read-only) + tab-budget progress, reusing `useConstraints`/`useTabCount`.
- Dependencies: none beyond existing hooks/components — can run in parallel with Phase 4.
- Risks: low.

**Phase 6 — Tab Budget page rework** (2 days)
- Objective: turn "Try again" into an actionable screen (§7).
- User outcome: the tab-budget page lists open tabs and lets the user close one directly from it, instead of looping.
- Changes: `tabbudget.ts` gains a `chrome.tabs.query` call (needs a small message-passing addition since enforcement pages can't call `chrome.tabs` directly without it being exposed — verify manifest permissions cover this from the enforcement page context, or route through a background message).
- Dependencies: none.
- Risks: medium — this is the one feature needing a new messaging path; scope it carefully so it doesn't reopen the `PopupMessage`/`EnforcementPageMessage` dead-type-surface problem noted in §14.

**Phase 7 — Onboarding** (1–2 days)
- Objective: first five minutes with the product (§12).
- User outcome: a first-time user understands what a constraint is by seeing it, not reading about it.
- Changes: extend `EmptyState` copy; add a live Checkpoint preview after first constraint creation.
- Dependencies: Phase 3 (preview should show the *fixed* Checkpoint, not the current inverted one).
- Risks: low.

**Phase 8 — Testing & accessibility pass** (2 days)
- Objective: catch regressions before release; verify the claims already made in the (currently aspirational) design docs about focus management and contrast.
- User outcome: none directly visible, but fewer regressions going forward.
- Changes: expand unit tests to cover the fixed Delay/Checkpoint logic from Phase 3; manual keyboard-only pass through Sites/Settings/all enforcement pages; contrast-check the new token set from Phase 2.
- Dependencies: Phases 1–7 substantially complete.
- Risks: low.

**Phase 9 — Polish** (2–3 days)
- Objective: close remaining visual gaps (§3): custom enforcement-page icon set, `AppShell`-equivalent explicit popup sizing, consistent CSS-module usage in `Dashboard.tsx` (remove inline styles).
- Dependencies: Phase 5.
- Risks: low.

**Phase 10 — Release**
- Objective: ship V2.
- Changes: bump manifest description/screenshots, update `STORE_SUBMISSION.md` to reflect the real (narrower, four-behavior) feature set rather than the current draft's V1-era language ("timed site locks," which predates the constraint/behavior model).
- Dependencies: all prior phases.
- Risks: low if prior phases are genuinely complete; the main risk is scope creep re-adding cut behaviors before they're actually rebuilt.

---

## 19. Current-State Scores → Realistic V2 Targets

| Dimension | Current | After V2 |
|---|---|---|
| Product clarity | 4/10 | 8/10 |
| UX | 4/10 | 7/10 |
| UI | 5/10 | 7/10 |
| Branding | 5/10 | 7/10 |
| Feature coherence | 3/10 | 8/10 |
| Engineering | 6/10 | 8/10 |
| Accessibility | 5/10 | 7/10 |
| **Overall** | **4.5/10** | **7.5/10** |

**Why these numbers, not higher or lower**: Engineering scores relatively well *today* (6/10) because the parts that exist — storage, DNR rules, the Modal, hooks — are genuinely competent; the low overall score is driven almost entirely by feature coherence (3/10), because a product whose headline differentiator is five-eighths non-functional cannot score higher than that regardless of how clean the surrounding code is. The V2 targets are deliberately not 9s or 10s: this is a roadmap for one developer working in scoped phases, not a rewrite, and "clearer, more distinctive, more polished, substantially better" (the user's own bar) is a 7–8 outcome, not a 10 — a 10 would imply no further work is warranted, which won't be true even after this roadmap lands.
