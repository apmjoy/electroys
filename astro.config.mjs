// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://electroys.com',
  // 'ignore' so file-like endpoints (/art/x.svg, /search.json) resolve in dev too;
  // the static build still emits directory URLs with trailing slashes.
  trailingSlash: 'ignore',
  // The floating dev toolbar would cover the phone tab bar during local review.
  devToolbar: { enabled: false },
  build: { format: 'directory', inlineStylesheets: 'never' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      // Legacy redirect stubs and utility pages stay out of the sitemap.
      filter: (page) => !/\/(legacy|wishlist|compare|gift|offline|404)\b/.test(page) && !page.endsWith('.html'),
    }),
  ],
});
