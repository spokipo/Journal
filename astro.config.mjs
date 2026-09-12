// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
const isBuild = process.argv.some(arg => arg.includes('build') || arg.includes('preview:worker') || arg.includes('deploy'));

export default defineConfig({
  output: 'static',
  ...(isBuild ? {
    adapter: cloudflare({
      prerenderEnvironment: 'node',
    }),
  } : {}),
  trailingSlash: 'ignore',
  integrations: [react()],

  vite: {
    plugins: [
      tailwindcss(),
      {
        name: 'cloudflare-workers-dev-shim',
        resolveId(id) {
          if (id === 'cloudflare:workers') {
            return '\0cloudflare:workers';
          }
        },
        load(id) {
          if (id === '\0cloudflare:workers') {
            return 'export const env = process.env;';
          }
        }
      }
    ],
    optimizeDeps: {
      include: [
        '@tiptap/react',
        '@tiptap/starter-kit',
        '@tiptap/extension-image',
        '@tiptap/extension-placeholder',
      ],
    },
  },
});