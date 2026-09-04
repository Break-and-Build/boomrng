# boomrng Privacy Policy

Last updated: September 4, 2026

boomrng is a Chrome extension that helps you stay focused by applying constraints you configure — Checkpoint, Delay, PIN Required, Hard Block, and scheduled locks — to specific sites, plus an optional limit on how many tabs you keep open. This policy explains exactly what data boomrng handles and where it lives.

## What boomrng stores permanently (`chrome.storage.local`)

This is data that stays on your device until you change it, delete it, or uninstall the extension:

- the sites you've configured constraints for, and each site's behavior (Checkpoint, Delay, PIN Required, Hard Block, or scheduled), delay duration, and any custom message you wrote for it
- whether a constraint is marked "private" (see below)
- your allowed-sites exception list
- your Tab Budget (max open tabs) setting
- your optional PIN, if you set one

## What boomrng stores temporarily (`chrome.storage.session`)

This data is cleared automatically — when the relevant tab closes, when you navigate away, when it's no longer needed, or at the latest when your browser session ends:

- the exact destination of a site you were about to visit that triggered a constraint, held only long enough to return you there if you choose to continue
- the countdown state for an active Delay wait

## What boomrng holds only in memory

A few things exist only in the extension's running memory, never written to any storage area at all, and are gone the moment the browser's background process restarts: a brief record that you clicked "Continue" on a specific tab, cleared within about a minute, and a brief record that you entered a correct PIN, cleared within about ten seconds. Each is used once.

## Why boomrng looks at the sites you visit

To apply a constraint at all, boomrng has to check the domain of a page you're about to load against the list of sites you've configured — that's the entire mechanism the extension exists to provide. boomrng does **not** keep a browsing history log. It doesn't record which sites you've visited over time, and the transient state described above exists only to make the "Continue" and Delay features work, not to track your activity.

## Network requests

boomrng stores your settings and site configuration locally in your browser. It does not make network requests of its own and does not transmit your configuration, PIN, or browsing activity off your device. It has no analytics, no advertising code, no telemetry, no crash reporting, and no remote configuration, and it does not require or support any account or sign-in.

## Your PIN

If you set a PIN, it's stored locally, in plain text — not encrypted or hashed. It's used only to gate a few things inside boomrng itself: revealing a private constraint's site, editing or deleting a protected constraint, and continuing past a PIN Required site. It is never transmitted anywhere, and it is never included when you export your settings.

## "Private" constraints

Marking a constraint private hides its site from view in boomrng's own popup until you unlock it with your PIN. This is a display setting inside boomrng's interface — the site is not encrypted or specially protected in storage, and it isn't hidden from Chrome itself. Visiting that site is still recorded in Chrome's own normal browsing history exactly like any other site, and if it's one of your open tabs, it can still appear in boomrng's own tab-limit recovery screen. Marking a constraint private controls what boomrng's popup shows you; it doesn't change what Chrome records.

## Forgetting your PIN

If you use "Forgot PIN?" to reset your PIN, boomrng permanently deletes the PIN and every constraint that was private or PIN Required. This can't be undone, and there is no way to recover the deleted constraints or the old PIN — boomrng has no copy of it to restore. Your other, non-protected constraints are left untouched.

## Exporting and importing your settings

When you export your settings, the file never includes your PIN, and private constraints are left out unless you explicitly choose to include them. An export is a plain, unencrypted file that you control — boomrng doesn't transmit it anywhere, but once you save or share it, whatever happens to that file is outside boomrng's control. Importing a settings file replaces your current constraint list; it never overwrites the PIN already set on your device.

## Incognito

boomrng does not currently support Incognito windows. Its enforcement pages cannot load there, so its constraints do not function in Incognito browsing in this version.

## Deleting your data

You can remove boomrng's data at any time by changing or deleting individual constraints, resetting your PIN, or uninstalling the extension — uninstalling removes everything boomrng stored.

## Contact

For questions about this privacy policy, contact the boomrng publisher through the Chrome Web Store listing or the repository associated with the extension.
