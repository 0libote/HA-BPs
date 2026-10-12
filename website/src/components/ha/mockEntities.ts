/** Mock HA entities so the showcase behaves 1:1 without a real instance. */
export interface MockEntity {
  entity_id: string;
  friendly: string;
  domain: string;
  device_class?: string;
  state: string;
}

export const MOCK_ENTITIES: MockEntity[] = [
  // doorbell
  { entity_id: 'binary_sensor.front_door_doorbell', friendly: 'Front Door Doorbell', domain: 'binary_sensor', state: 'off' },
  { entity_id: 'binary_sensor.back_door_doorbell', friendly: 'Back Door Doorbell', domain: 'binary_sensor', state: 'off' },
  // tts + speakers
  { entity_id: 'tts.home_assistant_cloud', friendly: 'HA Cloud TTS', domain: 'tts', state: 'ready' },
  { entity_id: 'tts.google_translate', friendly: 'Google Translate TTS', domain: 'tts', state: 'ready' },
  { entity_id: 'media_player.living_room_speaker', friendly: 'Living Room Speaker', domain: 'media_player', state: 'idle' },
  { entity_id: 'media_player.kitchen_speaker', friendly: 'Kitchen Speaker', domain: 'media_player', state: 'idle' },
  { entity_id: 'media_player.hallway_speaker', friendly: 'Hallway Speaker', domain: 'media_player', state: 'idle' },
  // BILRESA events
  ...[1, 2, 3].flatMap((preset) =>
    [1, 2, 3].map((b) => ({
      entity_id: `event.bilresa_preset_${preset}_button_${b}`,
      friendly: `BILRESA Preset ${preset} ${b === 1 ? 'Right' : b === 2 ? 'Left' : 'Centre'}`,
      domain: 'event',
      state: 'idle',
    })),
  ),
  // lights
  { entity_id: 'light.living_room_ceiling', friendly: 'Living Room Ceiling', domain: 'light', state: 'off' },
  { entity_id: 'light.kitchen_pendants', friendly: 'Kitchen Pendants', domain: 'light', state: 'off' },
  { entity_id: 'light.bedroom_lamp', friendly: 'Bedroom Lamp', domain: 'light', state: 'off' },
  { entity_id: 'light.hallway_bulb', friendly: 'Hallway Bulb', domain: 'light', state: 'off' },
  // motion / occupancy / presence
  { entity_id: 'binary_sensor.hallway_motion', friendly: 'Hallway Motion', domain: 'binary_sensor', device_class: 'motion', state: 'off' },
  { entity_id: 'binary_sensor.kitchen_occupancy', friendly: 'Kitchen Occupancy', domain: 'binary_sensor', device_class: 'occupancy', state: 'off' },
  { entity_id: 'binary_sensor.living_room_presence', friendly: 'Living Room Presence', domain: 'binary_sensor', device_class: 'presence', state: 'off' },
  { entity_id: 'binary_sensor.myggspray_motion', friendly: 'MYGGSPRAY Motion', domain: 'binary_sensor', device_class: 'motion', state: 'off' },
  // illuminance
  { entity_id: 'sensor.hallway_illuminance', friendly: 'Hallway Illuminance', domain: 'sensor', device_class: 'illuminance', state: '12 lx' },
  { entity_id: 'sensor.myggspray_illuminance', friendly: 'MYGGSPRAY Illuminance', domain: 'sensor', device_class: 'illuminance', state: '8 lx' },
];

export function filterEntities(filter: any): MockEntity[] {
  if (!filter) return MOCK_ENTITIES;
  const filters = Array.isArray(filter) ? filter : [filter];
  // HA semantics: entity matches if ANY filter entry matches all its keys.
  return MOCK_ENTITIES.filter((e) =>
    filters.some((f: any) => {
      if (f.domain && e.domain !== f.domain) return false;
      if (f.device_class && e.device_class !== f.device_class) return false;
      return true;
    }),
  );
}

export function rgbToCss(rgb: any): string {
  if (Array.isArray(rgb) && rgb.length === 3) return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  return '#888';
}

export function rgbToHex(rgb: any): string {
  if (!Array.isArray(rgb)) return '#888888';
  return '#' + rgb.map((v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
