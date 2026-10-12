// Single hand-drawn line-icon set for the whole site (24×24, stroke).
// Used by Icon.astro (static pages) and Icon.tsx (React island).
export const paths: Record<string, string[]> = {
  bell: [
    'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9',
    'M13.7 21a2 2 0 0 1-3.4 0',
  ],
  speaker: [
    'M11 5 6 9H2v6h4l5 4V5z',
    'M15.5 8.5a5 5 0 0 1 0 7',
    'M18.6 5.4a9 9 0 0 1 0 13.2',
  ],
  volume: ['M11 5 6 9H2v6h4l5 4V5z', 'M15.5 8.5a5 5 0 0 1 0 7'],
  dial: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  ],
  bulb: [
    'M9 18h6',
    'M10 21h4',
    'M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.6 1.5 2.6h4c0-1 .7-2 1.5-2.6A6 6 0 0 0 12 3z',
  ],
  bulbOff: [
    'M9 18h6',
    'M10 21h4',
    'M12 3a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.6 1.5 2.6h4c0-1 .7-2 1.5-2.6A6 6 0 0 0 12 3z',
    'M3 3l18 18',
  ],
  sliders: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6',
  ],
  droplet: ['M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  shield: [
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    'M9 12l2 2 4-4',
  ],
  book: [
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  ],
  home: [
    'M3 9.5l9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'M9 22v-8h6v8',
  ],
  arrowUpRight: ['M7 17L17 7', 'M8 7h9v9'],
  arrowLeft: ['M19 12H5', 'M12 19l-7-7 7-7'],
  chevDown: ['M6 9l6 6 6-6'],
  chevUp: ['M18 15l-6-6-6 6'],
  check: ['M20 6L9 17l-5-5'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  plus: ['M12 5v14', 'M5 12h14'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  copy: [
    'M9 9h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z',
    'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  ],
  download: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'M7 10l5 5 5-5',
    'M12 15V3',
  ],
};

/** HA `mdi:*` section icon → local icon key. */
export const mdiIcon: Record<string, string> = {
  'mdi:doorbell': 'bell',
  'mdi:account-voice': 'speaker',
  'mdi:volume-minus': 'volume',
  'mdi:remote': 'dial',
  'mdi:lightbulb-group': 'bulb',
  'mdi:lightbulb-group-off-outline': 'bulbOff',
  'mdi:tune': 'sliders',
  'mdi:palette': 'droplet',
  'mdi:motion-sensor': 'activity',
  'mdi:timer-outline': 'clock',
  'mdi:shield-check-outline': 'shield',
  'mdi:cog': 'sliders',
};
