import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  // Cloudflare Pages: build `bun run build`, output `dist`, no adapter needed.
  // Custom domain / SPA fallback not required — all routes prerendered.
  vite: {
    ssr: {
      noExternal: []
    }
  }
});
