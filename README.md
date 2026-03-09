# boomrng

**Behavioral constraint system for knowledge workers.**

boomrng enforces focus by blocking distracting sites and limiting your open tabs. It doesn't nag you; it stops you.

## Features

- **Hard Redirects:** Blocks sites like YouTube and snaps you back to work.
- **Timed Site Locks:** Set per-site lock timers in minutes, with automatic expiry.
- **PIN Timer Override:** Temporarily bypass an active timed lock by entering your PIN.
- **Tab Pressure:** Enforces a max tab limit (e.g., 5 tabs). If you open a 6th, it forces you to close one.
- **The Wall:** Prevents you from browsing inside an "over-limit" tab.

## How to Install (Developer Preview)

1.  Download this repo (Code -> Download ZIP) and unzip it.
2.  Open Chrome and go to `chrome://extensions`.
3.  Toggle **Developer mode** (top right).
4.  Click **Load unpacked**.
5.  Select the `boomrng` folder.

## Setup

1.  Click the boomrng icon in your toolbar.
2.  Add `youtube.com` (or your poison of choice) to Blocked Sites.
3.  (Optional) Add a timer in minutes for each blocked site. Leave blank to always block.
4.  Set a Redirect URL (e.g., `http://localhost:3000`, `https://figma.com`, `https://github.com`).
5.  (Optional) Set Max Tabs to 5 for "Hard Mode."
6.  Click **Save Settings**.

## Timer Override

1.  In settings, go to **Timer Override (PIN)**.
2.  Select a site with an active timed lock.
3.  Enter your PIN and click **Unlock Selected Site**.
