import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

// The static site still lives in the repo root and is served by serve.mjs on
// :8123 while pages are ported one at a time. Two consequences here:
//
//  · publicDir points at the root public/ folder, so /bg.mp4 and /assets/*
//    resolve to the same files both versions use;
//  · server.fs.allow lets src import site.css and nav-icons.css from the root,
//    so the design cannot drift between the two while the port runs.
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  // The gateway posts a call's transcript back to PUBLIC_URL. In dev that is a
  // tunnel, and Vite refuses requests whose Host header it does not recognise —
  // which is a 403 the tunnel reports as its own, so the posts look like they
  // never arrived. Allowing the tunnel's host is what lets them through.
  const env = loadEnv(mode, process.cwd(), '')
  const publicHost = env.PUBLIC_URL ? new URL(env.PUBLIC_URL).hostname : null

  return {
    resolve: { tsconfigPaths: true },
    publicDir: fileURLToPath(new URL('../public', import.meta.url)),
    server: {
      fs: { allow: [repoRoot] },
      // The tunnel's host, plus any tunnel host: a free ngrok URL changes every
      // time it restarts, and having to edit the config as well as .env for that
      // is how the webhook quietly goes back to being 403'd.
      allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.trycloudflare.com'].concat(
        publicHost ? [publicHost] : [],
      ),
    },
    plugins: [tanstackStart(), viteReact()],
  }
})
