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

const icons = {};
let failed = 0;
for (const name of WANT) {
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/@mdi/svg@latest/svg/${name}.svg`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();
    const ds = [...svg.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
    if (!ds.length) throw new Error('no path data');
    icons[name] = ds.join(' ');
    console.log(`ok  ${name} (${ds.length} subpath${ds.length > 1 ? 's' : ''})`);
  } catch (err) {
    if (prev[name]) {
      icons[name] = prev[name];
      console.log(`keep ${name} (fetch failed: ${err})`);
    } else {
      failed++;
      console.log(`FAIL ${name}: ${err}`);
    }
  }
}

if (failed > 0 && Object.keys(prev).length === 0) {
  console.error('No icons fetched and no cache — aborting.');
  process.exit(1);
}

writeFileSync(out, JSON.stringify({ source: '@mdi/svg', icons }, null, 1) + '\n');
console.log(`Wrote ${Object.keys(icons).length} icons -> ${out}`);
