# 0libote HA-BPs website

Astro + React islands + Bun. HA-dark everywhere. Deploys as pure static to **Cloudflare Pages**.

## Dev

```bash
cd website
bun install
bun run data:build   # parse ../blueprints/*.yaml -> src/data/blueprints.json
bun run dev          # http://localhost:4321
```

## Build (Cloudflare Pages)

- Build command: `bun run build` (runs `data:build` then `astro build`)
- Output directory: `dist`
- No adapter / no server — all routes prerendered.

## How showcase stays 1:1

`scripts/parse-blueprints.ts` reads every `blueprints/*.yaml`, preserving
sections (`name/icon/collapsed/description`), fields (defaults, descriptions)
and selector configs (`entity/number/text/boolean/duration/select/condition/
action/object/color_rgb/color_temp`). `ShowcaseEditor.tsx` renders each selector
the way HA does, with mock entities filtered by the blueprint's own filter.
Collapsed defaults match the YAML. Docs pages mix the hand-written
`blueprints/README.md` guide with the generated input tables.
