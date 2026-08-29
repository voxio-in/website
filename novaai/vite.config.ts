import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Rewrites the emitted <script> from an ES module to a classic script.
 *
 * The surrounding site is plain static files, sometimes opened straight off the
 * filesystem, and a `type="module" crossorigin` script is blocked by CORS on
 * file:// — the page renders blank. Paired with an iife bundle this keeps the
 * built page openable the same way every other page is.
 */
function classicScript() {
  return {
    name: 'classic-script',
    // Build only. In dev the entry really is an ES module and so is the HMR
    // client; demoting either to a classic script blanks the page.
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      // Scoped to the emitted <script> rather than applied document-wide: a
      // blanket `crossorigin` strip would also disarm the font preconnect, which
      // needs it to match the actual cross-origin font fetch.
      //
      // defer matters: unlike a module script, a classic one in <head> would run
      // before #root exists.
      return html.replace(
        /<script type="module"(?: crossorigin)? src=/g,
        '<script defer src=',
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), classicScript()],
  // relative asset URLs, so the build works from a subdirectory rather than the
  // server root
  base: './',
  build: {
    // NovaAI is its own site; it is emitted next to the other static pages as
    // /nova/ so nothing about the surrounding pages has to change but one href
    outDir: '../nova',
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
