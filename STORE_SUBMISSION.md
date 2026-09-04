# Chrome Web Store Submission Notes

Last updated: September 4, 2026

This file is a working draft for the Chrome Web Store listing and privacy fields for boomrng V2.

## Single purpose

boomrng helps users stay focused by applying constraints the user configures to specific sites — Checkpoint, Delay, PIN Required, Hard Block, and scheduled locks — and by enforcing a maximum-open-tabs limit.

## Suggested short description

Block, delay, or checkpoint distracting sites on your own terms, and keep tab overload in check.

## Suggested detailed description

boomrng is a focus-enforcement extension for Chrome. You configure a constraint per site and choose how it behaves:

- **Checkpoint** — an interstitial that asks "is that what you meant to do?" before letting you continue.
- **Delay** — a countdown you have to wait out before you're allowed to continue.
- **PIN Required** — continuing past the site requires entering your PIN.
- **Hard Block** — no path through; the site is not reachable while the constraint is active.
- **Scheduled locks** — restrict a constraint to specific days and time windows.

You can also mark a constraint **private** so its site is hidden from view in boomrng's own popup until unlocked with your PIN, maintain an **allowed sites** exception list, and set a **Tab Budget** — a maximum number of open tabs, enforced across all your normal Chrome windows, with a recovery screen that lets you close tabs to get back under the limit.

To apply these constraints, boomrng checks the domain of pages you're about to load, locally, against the sites you've configured — this is the entire mechanism the extension exists to provide. boomrng does not keep a browsing history log, and it does not transmit this data anywhere. It works entirely locally in your browser and does not require an account.

boomrng does not currently support Incognito windows; its constraints do not function there in this version.

## Permissions justification

`storage`
- Saves your constraints, settings, and PIN locally (`chrome.storage.local`), and holds short-lived enforcement state such as an in-progress Delay countdown or a pending "Continue" destination for the current browser session (`chrome.storage.session`).

`tabs`
- Counts open tabs for the Tab Budget feature, reads a tab's URL to recognize internal browser pages (like `chrome://` pages) that should never count toward the limit or be treated as constrained sites, and displays each open tab's title and domain in the Tab Budget recovery screen so the user can identify which tab to close.

`declarativeNetRequest`
- Applies the actual site blocking, redirect, and "Continue" behavior based on the user's configured constraints.

`alarms`
- Re-evaluates scheduled constraints when a time window starts or ends, and guarantees a temporary "Continue" exception is cleaned up even if the browser is busy.

`webNavigation`
- Lets boomrng recover the exact page a user was navigating to when a constraint triggered, entirely in the background, so that destination never has to appear in the constraint's own page URL or in Chrome's browsing history.

`<all_urls>` (host permission)
- Required so boomrng can apply blocking, delay, and redirect rules to whichever sites the user chooses to configure, which cannot be known in advance.

## Privacy fields guidance

Suggested answers, assuming the current codebase remains unchanged:

- **Personally identifiable information**: No
- **Health information**: No
- **Financial and payment information**: No
- **Authentication information**: Yes — the user may set a local PIN to gate certain actions inside boomrng (revealing a private constraint's site, editing or deleting a protected constraint, continuing past a PIN Required site). It is stored locally in plain text, is never transmitted anywhere, and is never included in an exported settings file. It is not used to authenticate the user to any account or remote service.
- **Personal communications**: No
- **Location**: No
- **Web history / browsing activity**: Yes — boomrng inspects the domains and URLs a user navigates to, locally, in order to apply that user's own configured constraints. It does not maintain a persistent browsing-history log, and it does not transmit this data anywhere.
- **Website content**: No
- **User activity**: No — boomrng does not use content scripts and does not monitor clicks, keystrokes, or on-page activity on visited sites.

  **INTERNAL — verify before submitting:** This answer has not yet been independently confirmed against the live Chrome Web Store Developer Dashboard's exact category wording. Verify that wording before submission.

If the dashboard's own wording differs materially from the summaries above, follow the dashboard's wording and keep the underlying facts (this file, and `PRIVACY.md`) as the source of truth.

## Data-use / Limited Use statement

Any data boomrng handles (see `PRIVACY.md` for the full inventory) is used exclusively to provide boomrng's own constraint-enforcement and tab-limit features, as described to the user in the extension itself and in this listing. It is:

- not used for advertising or any advertising-related purpose
- not sold to any third party
- not transferred to any third party
- not used for any purpose unrelated to boomrng's own user-facing functionality
- not used to make credit, employment, insurance, or other eligibility decisions

## Privacy policy URL

Publish `PRIVACY.md` at a public URL before submission.

Examples:

- GitHub rendered file URL
- GitHub Pages
- your product site

## Listing assets checklist

- 128x128 icon
- store screenshots showing:
  - configuring a Checkpoint/Delay/PIN Required/Hard Block constraint
  - a Checkpoint or Delay enforcement page in action
  - the Tab Budget recovery screen
  - Settings, including the private-constraint and PIN options
- optional promo images if you want merchandising assets

## Reviewer notes you can include

boomrng does not use remote code, analytics, ads, or accounts. All user settings are stored locally in Chrome extension storage, with a small amount of short-lived enforcement state in session storage that is cleared automatically. The extension uses host access only to apply the user's own configured site constraints, and uses `webNavigation` only to recover a blocked navigation's original destination locally, never to transmit it anywhere. Incognito is not supported in this version.
