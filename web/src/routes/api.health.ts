// GET /api/health — is the server up, and can it reach Postgres?

import { createFileRoute } from '@tanstack/react-router'

import { configuredDesks } from '#/server/calling'
import { SERVERS } from '#/server/voice/servers'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        let db: 'up' | 'down' | 'unconfigured' = 'unconfigured'
        let detail: string | undefined

        if (process.env.DATABASE_URL) {
          try {
            const { db: prisma } = await import('#/server/db')
            await prisma.$queryRaw`SELECT 1`
            db = 'up'
          } catch (err) {
            db = 'down'
            detail = err instanceof Error ? err.message.split('\n')[0] : String(err)
          }
        }

        return Response.json(
          {
            ok: true,
            server: 'up',
            db,
            detail,
            desks: configuredDesks(),
            servers: SERVERS,
            at: new Date().toISOString(),
          },
          { headers: { 'cache-control': 'no-store' } },
        )
      },
    },
  },
})
