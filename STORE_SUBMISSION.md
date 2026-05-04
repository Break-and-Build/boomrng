# Chrome Web Store Submission Notes

Last updated: April 3, 2026

This file is a working draft for the Chrome Web Store listing and privacy fields for boomrng.

## Single purpose

boomrng helps users stay focused by blocking distracting sites, applying timed locks, and enforcing a tab limit.

## Suggested short description

Block distracting sites, apply timed locks, and control tab overload.

## Suggested detailed description

boomrng is a focus enforcement extension for Chrome. It blocks distracting sites, supports optional timed site locks, and can enforce a maximum tab count so your browser stays under control.

Key features:

- block or redirect configured distracting sites
- set timed site locks in minutes
- optionally protect settings with a local PIN
- temporarily override an active timed lock with your PIN
- enforce a max tab limit and show a limit screen when you go over

boomrng works locally in your browser and does not require an account in this version.

## Permissions justification

`storage`
- Saves your block list, timers, PIN lock, redirect URL, allow list, and max-tab settings locally.

`tabs`
- Counts open tabs for the tab-limit feature and redirects the current tab to the limit screen when the limit is exceeded.

`declarativeNetRequest`
- Applies site blocking and redirect rules based on your settings.

`alarms`
- Refreshes timed lock rules when a timer starts, expires, or is bypassed.

`<all_urls>`
- Required so the extension can block or redirect the sites the user chooses across the web.

## Privacy fields guidance

Use the Chrome Web Store privacy fields to describe the extension accurately.

Suggested answers, assuming the current codebase remains unchanged:

- Personal communications: No
- Financial information: No
- Health information: No
- Authentication information: No
- Personal location: No
- Web history: Yes, used locally to apply user-configured blocking and tab-management features
- User activity: Yes, limited to local extension functionality for site blocking and tab counting
- Website content: No

If the dashboard wording differs, keep the answers aligned with the current behavior and the privacy policy.

## Privacy policy URL

Publish `PRIVACY.md` at a public URL before submission.

Examples:

- GitHub rendered file URL
- GitHub Pages
- your product site

## Listing assets checklist

- 128x128 icon
- store screenshots showing:
  - blocked sites setup
  - timed locks
  - tab limit / limit screen
  - timer override flow
- optional promo images if you want merchandising assets

## Reviewer notes you can include

boomrng does not use remote code, analytics, ads, or accounts in this version. All user settings are stored locally in Chrome extension storage. The extension uses host access only to apply user-configured site blocking and redirect behavior.
