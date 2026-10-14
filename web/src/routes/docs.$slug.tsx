import { createFileRoute, Link, notFound, redirect } from '@tanstack/react-router'

import DocArticle from '#/components/docs/DocArticle'
import { pageBySlug } from '#/lib/docs/pages'

export const Route = createFileRoute('/docs/$slug')({
  loader: ({ params }) => {
    if (params.slug === 'introduction') throw redirect({ to: '/docs' })
    const page = pageBySlug(params.slug)
    if (!page) throw notFound()
    return { slug: page.slug }
  },
  head: ({ params }) => {
    const page = pageBySlug(params.slug)
    return {
      meta: page
        ? [{ title: `${page.title} — Voxio Docs` }, { name: 'description', content: page.summary }]
        : [{ title: 'Not found — Voxio Docs' }],
      links: page
        ? [
            { rel: 'canonical', href: `https://voxio.in/docs/${page.slug}` },
            { rel: 'alternate', type: 'text/markdown', href: `/docs/${page.slug}.md` },
            { rel: 'describedby', href: '/docs/llms.txt' },
          ]
        : [],
    }
  },
  component: DocPageRoute,
  notFoundComponent: () => (
    <article className="docs-main">
      <h1 className="docs-h1">Page not found</h1>
      <p className="docs-lede">There's no docs page here. <Link to="/docs">Start from the introduction</Link>.</p>
    </article>
  ),
})

function DocPageRoute() {
  const { slug } = Route.useLoaderData()
  return <DocArticle key={slug} page={pageBySlug(slug)!} />
}
