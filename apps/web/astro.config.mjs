// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Primary target is GitHub Pages (project site). For Cloudflare Pages or a custom domain,
// change `site` and drop `base`; nothing else depends on the host.
export default defineConfig({
  site: 'https://hazeliscoding.github.io',
  base: '/conatlas-tx',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
    // Small font subsets (Cyrillic, Greek) were inlined into the render-blocking CSS though no
    // page uses them; as files they're never requested.
    build: { assetsInlineLimit: 0 },
  },
});
