/**
 * Fetch real MDI icon path data (and refresh) into src/data/mdi.json.
 * Run: bun scripts/fetch-icons.mjs
 * Source: @mdi/svg via jsDelivr. The committed JSON keeps builds offline-safe;
 * failed fetches keep the previously committed entry.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/data/mdi.json');

const WANT = [
  // blueprint section icons (mdi: names from blueprints/*.yaml)
  'doorbell', 'account-voice', 'volume-minus', 'remote',
  'lightbulb-group', 'lightbulb-group-off-outline', 'tune', 'palette',
  'motion-sensor', 'timer-outline', 'shield-check-outline',
  // HA sidebar
  'menu', 'menu-open', 'view-dashboard', 'lightning-bolt', 'map',
  'post-outline', 'history', 'folder-play', 'clipboard-check',
  'bell', 'cog',
  // picker / editor UI
  'chevron-down', 'chevron-up', 'menu-down', 'close', 'plus', 'magnify',
  'content-save', 'arrow-left', 'dots-vertical', 'drag', 'shape',
  'book', 'pencil',
  // entity domain badges
  'lightbulb', 'speaker', 'thermometer',
];

let prev = {};
if (existsSync(out)) {
  try {
    prev = JSON.parse(readFileSync(out, 'utf-8')).icons ?? {};
  } catch { /* ignore */ }
}

async function fetchOne(name, prev) {
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/${name}.svg`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();
    const ds = [...svg.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
    if (!ds.length) throw new Error('no path data');
    return { name, d: ds.join(' '), subpaths: ds.length };
  } catch (err) {
    if (prev[name]) return { name, d: prev[name], kept: true, err: String(err) };
    return { name, err: String(err) };
  }
}

const results = await Promise.all(WANT.map((name) => fetchOne(name, prev)));
const icons = {};
let failed = 0;
for (const r of results) {
  if (!r.d) {
    failed++;
    console.log(`FAIL ${r.name}: ${r.err}`);
  } else if (r.kept) {
    icons[r.name] = r.d;
    console.log(`keep ${r.name} (fetch failed: ${r.err})`);
  } else {
    icons[r.name] = r.d;
    console.log(`ok  ${r.name} (${r.subpaths} subpath${r.subpaths > 1 ? 's' : ''})`);
  }
}

if (failed > 0 && Object.keys(prev).length === 0) {
  console.error('No icons fetched and no cache — aborting.');
  process.exit(1);
}

writeFileSync(out, JSON.stringify({ source: '@mdi/svg', icons }, null, 1) + '\n');
console.log(`Wrote ${Object.keys(icons).length} icons -> ${out}`);
