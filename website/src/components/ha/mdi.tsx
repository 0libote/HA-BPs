import React from 'react';
import mdi from '../../data/mdi.json';

const ICONS: Record<string, string> = (mdi as any).icons ?? {};

/** Real Material Design Icon path data (fetched at build time, see scripts/fetch-icons.mjs). */
export function MdiIcon({ name, size = 24 }: { name: string; size?: number }) {
  const d = ICONS[name] ?? ICONS.tune;
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flex: 'none', display: 'block', fill: 'currentColor' }}
    >
      <path d={d} />
    </svg>
  );
}
