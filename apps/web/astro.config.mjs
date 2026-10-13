// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Hosted on Vercel at the domain root. For another host or a custom domain, change `site` (and
// SITE in e2e/seo.spec.ts); nothing else depends on the host.
export default defineConfig({
  site: 'https://conatlas-tx.vercel.app',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
    // Small font subsets (Cyrillic, Greek) were inlined into the render-blocking CSS though no
    // page uses them; as files they're never requested.
    build: { assetsInlineLimit: 0 },
  },
});
