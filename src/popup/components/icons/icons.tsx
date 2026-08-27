import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement>;

/**
 * Shared 20x20 grid, 1.5px stroke, rounded joins — see
 * BOOMRNG-V2-DESIGN-SPEC.md §20. Only the icons this milestone needs
 * (Dashboard, Sites, Settings, Add) are implemented; the rest of the
 * icon family is built out alongside the screens that need them.
 */
function UiIcon({ children, ...props }: IconProps & { children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1.3" />
      <rect x="11" y="3" width="6" height="6" rx="1.3" />
      <rect x="3" y="11" width="6" height="6" rx="1.3" />
      <rect x="11" y="11" width="6" height="6" rx="1.3" />
    </UiIcon>
  );
}

export function SitesIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <circle cx="10" cy="10" r="7" />
      <ellipse cx="10" cy="10" rx="3.1" ry="7" />
      <line x1="3.2" y1="10" x2="16.8" y2="10" />
    </UiIcon>
  );
}

export function SettingsIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3.3v2.1M10 14.6v2.1M16.7 10h-2.1M5.4 10H3.3M14.9 5.1l-1.5 1.5M6.6 13.4l-1.5 1.5M14.9 14.9l-1.5-1.5M6.6 6.6L5.1 5.1" />
    </UiIcon>
  );
}

export function AddIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <line x1="10" y1="4.5" x2="10" y2="15.5" />
      <line x1="4.5" y1="10" x2="15.5" y2="10" />
    </UiIcon>
  );
}

/** Reused for "private constraint" (§20 addendum) — same glyph as PIN Required. */
export function LockIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <rect x="5.5" y="9" width="9" height="6.5" rx="1.3" />
      <path d="M7.3 9V6.8a2.7 2.7 0 0 1 5.4 0V9" />
    </UiIcon>
  );
}

/** Open arc + dot — the pause-and-choose glyph (§20). */
export function CheckpointIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <path d="M14.7 6.2A6 6 0 1 1 6 4" />
      <circle cx="14.8" cy="6.1" r="1" fill="currentColor" stroke="none" />
    </UiIcon>
  );
}

/** Partial ring, distinct opening from Checkpoint's — ties to the Delay page's own closing ring (§20). */
export function DelayIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <path d="M16 10.6A6 6 0 1 1 9.7 4" />
    </UiIcon>
  );
}

/** A boundary, not a prohibition sign — no red, no diagonal slash (§20). */
export function HardBlockIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <circle cx="10" cy="10" r="6.4" />
      <line x1="5.6" y1="10" x2="14.4" y2="10" />
    </UiIcon>
  );
}

/** Focused-screen back arrow (§8, §11) — a familiar, reversible utility action (§27). */
export function BackIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <path d="M12.5 5L7.5 10L12.5 15" />
    </UiIcon>
  );
}

/** A pencil on a line — Sites row action, §10. */
export function EditIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <path d="M4.5 15.5L5.3 12l8-8 2.7 2.7-8 8-3.5.8z" />
    </UiIcon>
  );
}

/** A simple trash can — Sites row action, §10. */
export function DeleteIcon(props: IconProps): React.ReactElement {
  return (
    <UiIcon {...props}>
      <path d="M5 6h10M8 6V4.6a1.3 1.3 0 0 1 1.3-1.3h1.4A1.3 1.3 0 0 1 12 4.6V6" />
      <path d="M6.3 6v9a1 1 0 0 0 1 1h5.4a1 1 0 0 0 1-1V6" />
    </UiIcon>
  );
}

/**
 * The Boomrng product mark — Concept A, "Smooth Arc" (§4). Locked as the
 * V2 direction; first pass only, not final artwork.
 */
export function MarkIcon(props: IconProps): React.ReactElement {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path
        d="M23 8 A12 12 0 1 1 8.5 22.5"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </svg>
  );
}
