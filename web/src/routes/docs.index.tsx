import { createFileRoute } from '@tanstack/react-router'

import DocArticle from '#/components/docs/DocArticle'
import { pageBySlug } from '#/lib/docs/pages'

const page = pageBySlug('introduction')!

export const Route = createFileRoute('/docs/')({
  head: () => ({
    meta: [
      { title: 'Voxio Docs' },
      { name: 'description', content: page.summary },
    ],
    links: [
      { rel: 'canonical', href: 'https://voxio.in/docs' },
      { rel: 'alternate', type: 'text/markdown', href: '/docs/introduction.md' },
      { rel: 'describedby', href: '/docs/llms.txt' },
    ],
  }),
  component: () => <DocArticle page={page} />,
})
