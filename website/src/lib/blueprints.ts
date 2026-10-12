import data from '../data/blueprints.json';

export interface BpField {
  key: string;
  name: string;
  description: string;
  default: any;
  selectorType: string;
  selector: any;
}

export interface BpSection {
  key: string;
  name: string;
  icon: string;
  collapsed: boolean;
  description: string;
  fields: BpField[];
}

export interface Blueprint {
  slug: string;
  file: string;
  name: string;
  author: string;
  description: string;
  domain: string;
  source_url: string;
  min_version: string;
  sections: BpSection[];
  fieldCount: number;
  githubUrl: string;
  importUrl: string;
  manualUrl: string;
  docsMarkdown: string;
  rawYaml: string;
}

export const blueprints: Blueprint[] = (data as any).blueprints;
export const getBlueprint = (slug: string) => blueprints.find((b) => b.slug === slug);

export const shortBlurb: Record<string, string> = {
  'doorbell-announcement':
    'A doorbell press announced on every chosen speaker through TTS, with per-announcement volume and a cleanup pass afterwards. One failing speaker does not stop the rest.',
  'bilresa-scroll-wheel':
    'Three presets sharing one wheel feel: fast spins apply as a single jump from Matter press counts, scrolling right wakes lights at minimum, centre tap cycles colours and hold toggles power.',
  'myggspray-auto-lights':
    'Motion lighting with separately selected lux sensing. Brightness and colour go out in one call, the previous light profile is remembered and restored before switch-off.',
  'forgot-to-turn-off':
    'Never turns anything on. Switches lights off only after every selected sensor stays clear for the full delay; unknown or unavailable sensors block switch-off instead of causing it.',
};

export const bpNeeds: Record<string, string> = {
  'doorbell-announcement': 'doorbell binary sensor · TTS entity · media players',
  'bilresa-scroll-wheel': 'BILRESA via Matter · 9 event entities · lights',
  'myggspray-auto-lights': 'motion sensor · illuminance sensor · lights',
  'forgot-to-turn-off': 'motion / occupancy sensors · lights',
};

/** Registry-row icon per blueprint. */
export const bpIcon: Record<string, string> = {
  'doorbell-announcement': 'bell',
  'bilresa-scroll-wheel': 'dial',
  'myggspray-auto-lights': 'activity',
  'forgot-to-turn-off': 'bulbOff',
};

export function defaultValueFor(field: BpField): any {
  if (field.default !== null && field.default !== undefined) return structuredCloneSafe(field.default);
  switch (field.selectorType) {
    case 'boolean': return false;
    case 'number': return field.selector?.min ?? 0;
    case 'text': return '';
    case 'entity': return field.selector?.multiple ? [] : '';
    case 'select': return field.selector?.options?.[0]?.value ?? field.selector?.options?.[0] ?? '';
    case 'duration': return { hours: 0, minutes: 0, seconds: 0 };
    case 'object': return Array.isArray(field.default) ? structuredCloneSafe(field.default) : [];
    case 'color_rgb': return [255, 214, 170];
    case 'color_temp': return field.selector?.min ?? 2700;
    default: return field.selector?.multiple ? [] : '';
  }
}

function structuredCloneSafe<T>(v: T): T {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return v;
  }
}

export function initialValues(bp: Blueprint): Record<string, any> {
  const out: Record<string, any> = {};
  for (const s of bp.sections) for (const f of s.fields) out[f.key] = defaultValueFor(f);
  return out;
}

/** Build a HA-style automation YAML preview from current showcase values. */
export function buildAutomationYaml(bp: Blueprint, values: Record<string, any>, automationName: string): string {
  const lines: string[] = [];
  lines.push(`alias: ${automationName || bp.name}`);
  lines.push(`description: Created from 0libote showcase replica (mock entities)`);
  lines.push(`use_blueprint:`);
  lines.push(`  path: 0libote/${bp.file}`);
  lines.push(`  input:`);
  for (const s of bp.sections) {
    for (const f of s.fields) {
      const v = values[f.key];
      if (v === undefined) continue;
      // Skip empty condition/action lists like HA does
      if ((f.selectorType === 'condition' || f.selectorType === 'action') && Array.isArray(v) && v.length === 0) continue;
      if (Array.isArray(v) && v.length === 0 && f.default !== undefined && JSON.stringify(f.default) === '[]') continue;
      lines.push(`    ${f.key}: ${yamlScalar(v, 4)}`);
    }
  }
  lines.push(`mode: single`);
  return lines.join('\n');
}

function yamlScalar(v: any, indent: number): string {
  const pad = ' '.repeat(indent + 2);
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (v === '') return `''`;
    if (/[:#\n"'[\]{}]/.test(v)) return JSON.stringify(v);
    return v;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) return `[${v.map((x) => yamlScalar(x, indent)).join(', ')}]`;
    // object list (colours)
    const rows = v.map((item) => {
      if (item && typeof item === 'object' && 'colour' in item) {
        const rgb = Array.isArray((item as any).colour) ? `[${(item as any).colour.join(', ')}]` : String((item as any).colour);
        return `\n${pad}- name: ${yamlScalar((item as any).name ?? '', indent)}\n${pad}  colour: ${rgb}`;
      }
      return `\n${pad}- ${yamlScalar(item, indent)}`;
    });
    return rows.join('');
  }
  if (typeof v === 'object') {
    // duration
    const parts = Object.entries(v).map(([k, val]) => `${k}: ${val}`);
    return `{${parts.join(', ')}}`;
  }
  return JSON.stringify(v);
}
