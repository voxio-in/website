import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Rewrites the emitted <script> from an ES module to a classic script.
 *
 * The rest of the site is plain static files opened straight off the
 * filesystem, and a `type="module" crossorigin` script is blocked by CORS on
 * file:// — the page renders blank. Pairing this with an iife bundle keeps the
 * built app openable the same way every other page is.
 */
function classicScript() {
  return {
    name: 'classic-script',
    transformIndexHtml(html: string) {
      // defer matters: unlike a module script, a classic one in <head> would run
      // before #root exists
      return html
        .replace(/ type="module"/g, ' defer')
        .replace(/ crossorigin/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), classicScript()],
  // relative asset URLs, so dist/ works when opened from a subdirectory or
  // straight off the filesystem rather than a server root
  base: './',
  build: {
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
