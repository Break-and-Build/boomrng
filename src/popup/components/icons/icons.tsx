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
