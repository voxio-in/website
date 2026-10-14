// GET /docs/llms.txt — the docs index for AI tools (llmstxt.org format).

import { createFileRoute } from '@tanstack/react-router'

import { llmsTxt } from '#/lib/docs/markdown'

export const Route = createFileRoute('/docs_/llms.txt')({
  server: {
    handlers: {
      GET: () => new Response(llmsTxt(), {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
      }),
    },
  },
})
