import React from 'react';
import { paths } from '../icons';

export function Icon({ name, size = 18, sw = 1.8 }: { name: string; size?: number; sw?: number }) {
  const d = paths[name] ?? paths.sliders;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none', display: 'block' }}
    >
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
