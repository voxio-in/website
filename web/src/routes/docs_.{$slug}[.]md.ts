// GET /docs/<page>.md — one docs page as clean Markdown, for AI tools and the
// "Copy page" button. The same content as the HTML page, generated from it.

import { createFileRoute } from '@tanstack/react-router'

import { pageBySlug, pageMarkdown } from '#/lib/docs/markdown'

export const Route = createFileRoute('/docs_/{$slug}.md')({
  server: {
    handlers: {
      GET: ({ params }) => {
        const page = pageBySlug(params.slug)
        if (!page) return new Response('No docs page here. See /docs/llms.txt for the index.\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
        return new Response(pageMarkdown(page), {
          headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=300' },
        })
      },
    },
  },
})
