// GET /docs/llms-full.txt — every docs page, as Markdown, in one file.

import { createFileRoute } from '@tanstack/react-router'

import { llmsFullTxt } from '#/lib/docs/markdown'

export const Route = createFileRoute('/docs_/llms-full.txt')({
  server: {
    handlers: {
      GET: () => new Response(llmsFullTxt(), {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
      }),
    },
  },
})
