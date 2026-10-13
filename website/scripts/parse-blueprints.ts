/**
 * Parse blueprints/*.yaml -> src/data/blueprints.json
 * Run with: bun scripts/parse-blueprints.ts
 * Keeps HA `!input` tags parseable by stripping the tag (value becomes the input name).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = join(import.meta.dirname, '../..');
const BP_DIR = join(ROOT, 'blueprints');
const OUT = join(import.meta.dirname, '../src/data/blueprints.json');
const README_PATH = join(BP_DIR, 'README.md');

type SelectorType =
  | 'entity' | 'number' | 'text' | 'boolean' | 'duration'
  | 'condition' | 'action' | 'select' | 'object'
  | 'color_rgb' | 'color_temp' | 'unknown';

function selectorOf(sel: any): { type: SelectorType; config: any } {
  if (!sel || typeof sel !== 'object') return { type: 'unknown', config: {} };
  const keys = Object.keys(sel);
  if (keys.length === 0) {
    // e.g. `boolean:` with null value, `condition:` with null
    return { type: 'unknown', config: {} };
  }
  const type = keys[0] as SelectorType;
  return { type, config: sel[type] ?? {} };
}

function parseDocsMarkdown(md: string): Record<string, string> {
  // Split blueprints/README.md by "## <Title>" into per-blueprint chunks.
  const chunks: Record<string, string> = {};
  const parts = md.split(/^## /m);
  // parts[0] is intro; rest are sections
  const titles = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  parts.slice(1).forEach((body, i) => {
    const title = titles[i];
    chunks[title] = '## ' + title + '\n' + body.slice(body.indexOf('\n') + 1).trim();
  });
  return chunks;
}

function titleToSlugFile(title: string): string | null {
  // Match docs heading to blueprint file via known mapping + fuzzy fallback.
  const lower = title.toLowerCase();
  if (lower.includes('doorbell')) return 'doorbell-announcement.yaml';
  if (lower.includes('bilresa')) return 'bilresa-scroll-wheel.yaml';
  if (lower.includes('myggspray')) return 'myggspray-auto-lights.yaml';
  if (lower.includes('forgot')) return 'forgot-to-turn-off.yaml';
  return null;
}

const files = readdirSync(BP_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();
const readme = readFileSync(README_PATH, 'utf-8');
const docsChunks = parseDocsMarkdown(readme);

const blueprints = files.map((file) => {
  const raw = readFileSync(join(BP_DIR, file), 'utf-8');
  const stripped = raw.replace(/!input\s+/g, '');
  const data = parseYaml(stripped) as any;
  const bp = data?.blueprint ?? {};
  const slug = basename(file, '.yaml');

  const inputTree: Record<string, any> = bp.input ?? {};
  const sections: any[] = [];
  for (const [sectionKey, sectionVal] of Object.entries<any>(inputTree)) {
    if (sectionVal && typeof sectionVal === 'object' && sectionVal.input && typeof sectionVal.input === 'object') {
      const fields = Object.entries<any>(sectionVal.input).map(([fieldKey, f]) => {
        const { type, config } = selectorOf(f?.selector);
        return {
          key: fieldKey,
          name: f?.name ?? fieldKey,
          description: f?.description ?? '',
          default: f?.default ?? null,
          selectorType: type,
          selector: config ?? {},
          raw: f ?? {},
        };
      });
      sections.push({
        key: sectionKey,
        name: sectionVal.name ?? sectionKey,
        icon: sectionVal.icon ?? 'mdi:cog',
        collapsed: sectionVal.collapsed ?? true,
        description: sectionVal.description ?? '',
        fields,
      });
    } else {
      // Non-section input (none currently, but support it)
      const { type, config } = selectorOf((sectionVal as any)?.selector);
      sections.push({
        key: '_ungrouped',
        name: 'Inputs',
        icon: 'mdi:cog',
        collapsed: false,
        description: '',
        fields: [
          {
            key: sectionKey,
            name: (sectionVal as any)?.name ?? sectionKey,
            description: (sectionVal as any)?.description ?? '',
            default: (sectionVal as any)?.default ?? null,
            selectorType: type,
            selector: config ?? {},
            raw: sectionVal,
          },
        ],
      });
    }
  }

  const githubUrl = `https://github.com/0libote/HA-BPs/blob/main/blueprints/${file}`;
  const importUrl =
    `https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=` +
    encodeURIComponent(githubUrl);

  // Find matching docs chunk
  let docsMarkdown = '';
  for (const [title, chunk] of Object.entries(docsChunks)) {
    if (titleToSlugFile(title) === file) docsMarkdown = chunk;
  }

  docsMarkdown = docsMarkdown.replace(/\]\(([a-z0-9-]+\.ya?ml)\)/g,
    (_, source) => `](https://github.com/0libote/HA-BPs/blob/main/blueprints/${source})`);

  return {
    slug,
    file,
    name: bp.name ?? slug,
    author: bp.author ?? '0libote',
    description: (bp.description ?? '').trim(),
    domain: bp.domain ?? 'automation',
    source_url: bp.source_url ?? githubUrl,
    min_version: bp.homeassistant?.min_version ?? '2025.7.0',
    sections,
    fieldCount: sections.reduce((n, s) => n + s.fields.length, 0),
    githubUrl,
    importUrl,
    manualUrl: githubUrl,
    docsMarkdown,
    rawYaml: raw,
  };
});

mkdirSync(join(import.meta.dirname, '../src/data'), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), blueprints }, null, 2));
console.log(`Wrote ${blueprints.length} blueprints -> ${OUT}`);
for (const b of blueprints) console.log(` - ${b.slug}: ${b.sections.length} sections, ${b.fieldCount} fields`);
