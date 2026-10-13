import data from '../data/blueprints.json' with { type: 'json' };
import { stringify } from 'yaml';

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
  'doorbell-announcement': 'doorbell sensor or event · TTS entity · media players',
  'bilresa-scroll-wheel': 'BILRESA via Matter · 3 event entities per used preset · lights',
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
  if (field.default !== null && field.default !== undefined) return structuredClone(field.default);
  switch (field.selectorType) {
    case 'boolean': return false;
    case 'number': return field.selector?.min ?? 0;
    case 'text': return '';
    case 'entity': return field.selector?.multiple ? [] : '';
    case 'select': return field.selector?.options?.[0]?.value ?? field.selector?.options?.[0] ?? '';
    case 'duration': return { hours: 0, minutes: 0, seconds: 0 };
    case 'object': return Array.isArray(field.default) ? structuredClone(field.default) : [];
    case 'color_rgb': return [255, 214, 170];
    case 'color_temp': return field.selector?.min ?? 2700;
    default: return field.selector?.multiple ? [] : '';
  }
}

export function initialValues(bp: Blueprint): Record<string, any> {
  const out: Record<string, any> = {};
  for (const s of bp.sections) for (const f of s.fields) out[f.key] = defaultValueFor(f);
  return out;
}

/**
 * Interactive lists carry UI-only row ids (stable React keys); they must not
 * leak into exported automation YAML. Our schemas never use `id` as data.
 */
function stripRowIds(v: any): any {
  if (Array.isArray(v)) return v.map(stripRowIds);
  if (v && typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (k !== 'id') out[k] = stripRowIds(val);
    }
    return out;
  }
  return v;
}

/** Build a HA-style automation YAML preview from current showcase values. */
export function buildAutomationYaml(bp: Blueprint, values: Record<string, any>, automationName: string): string {
  const inputs: Record<string, any> = {};
  for (const section of bp.sections) {
    for (const field of section.fields) {
      const value = values[field.key];
      if (value === undefined) continue;
      if ((field.selectorType === 'condition' || field.selectorType === 'action') &&
          Array.isArray(value) && value.length === 0) continue;
      if (Array.isArray(value) && value.length === 0 &&
          Array.isArray(field.default) && field.default.length === 0) continue;
      inputs[field.key] = stripRowIds(value);
    }
  }
  // Let YAML handle quoting and nested user actions. Inherit execution mode
  // from the blueprint: overriding every export to single loses remote bursts
  // and prevents the passive safety countdown from restarting.
  return stringify({
    alias: automationName || bp.name,
    description: 'Created from 0libote showcase replica (mock entities)',
    use_blueprint: { path: `0libote/${bp.file}`, input: inputs },
  });
}
