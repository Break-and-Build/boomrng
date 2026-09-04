# boomrng

**Behavioral constraint system for intentional browsing.**

boomrng lets you configure how much friction a distracting site gets — from a simple checkpoint to a hard block — instead of a single one-size-fits-all rule.

## Features

- **Checkpoint** — an interstitial that asks "is that what you meant to do?" before you continue.
- **Delay** — wait out a countdown before you're allowed to continue.
- **PIN Required** — continuing past the site requires your PIN.
- **Hard Block** — no path through while the constraint is active.
- **Scheduled locks** — restrict a constraint to specific days and times.
- **Private constraints** — hide a constraint's site in boomrng's own popup until you unlock it with your PIN.
- **Allowed Sites** — an exception list that's never constrained.
- **Tab Budget** — a maximum open-tab count, enforced across all your normal Chrome windows, with a recovery screen to get back under the limit.

## How to Install (Developer Preview)

1.  Download this repo (Code -> Download ZIP) and unzip it.
2.  Open Chrome and go to `chrome://extensions`.
3.  Toggle **Developer mode** (top right).
4.  Click **Load unpacked**.
5.  Select the `boomrng` folder.

## Setup

1.  Click the boomrng icon in your toolbar.
2.  Add a site and choose its behavior — Checkpoint, Delay, PIN Required, Hard Block, or a scheduled lock.
3.  (Optional) Mark it private, or add a custom reminder message.
4.  (Optional) Set a Tab Budget to cap how many tabs you keep open at once.
5.  (Optional) Set a PIN in Settings to protect private constraints and PIN Required sites.

## PIN Notes

- The PIN is local to your browser profile — no account, no cloud sync.
- If you forget your PIN, use "Forgot PIN?" to reset it. This permanently deletes the PIN along with every private and PIN Required constraint — it can't be undone.

## Incognito

boomrng does not currently support Incognito windows; its constraints do not function there in this version.

## Privacy

- boomrng works entirely locally in your browser and makes no network requests of its own.
- It does not transmit your configuration, PIN, or browsing activity off your device.
- Your PIN is stored locally in plain text, never transmitted, and never included when you export your settings.
- Marking a constraint private hides its site in boomrng's own popup — it does not encrypt it or hide it from Chrome's own browsing history.
- No account, analytics, ads, or third-party tracking are built into this version.
- See [`PRIVACY.md`](./PRIVACY.md) for the complete privacy policy.
