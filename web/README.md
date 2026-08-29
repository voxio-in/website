# voxio-web

The Voxio site as a real app: **TanStack Start** (TanStack Router + SSR + server
functions), so the frontend and the backend are one project — the same router
the dashboard uses.

See **Running it** below for the commands.

## Where things are

| Path                     | What                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `src/routes/`            | one file per page; `__root.tsx` is the shared document + chrome |
| `src/components/`        | Navbar, GlassDefs (the SVG glass filter), HeroVideo, SiteFooter, useReveal |
| `src/server/db.ts`       | the Prisma client, one per process                             |
| `src/routes/api.health.ts` | GET /api/health — server and database status                |
| `prisma/schema.prisma`   | Postgres schema — empty until the first feature lands          |

## The port is done

All thirteen pages are routes now:

| Route | Was |
| ----- | --- |
| `/` `/work` `/testimonials` `/collaborations` `/about` `/contact` | the main site |
| `/calling` `/calling/work` `/calling/testimonials` `/calling/collaborations` `/calling/about` | the calling product site |
| `/avatar` `/webnav` | the avatar and navigator product pages |

Each page's own `<style>` block became `src/styles/<page>.css`, imported by that
route alone. `Navbar` switches nav by path — the main site with its Products
pane, the calling site, and the two single-page product sites whose nav points
at sections and follows a scroll spy. `src/lib/calling.ts` is the calling demo's
WebRTC console, moved across verbatim and started by the route on mount.

The `.html` files are still in the repo root and still served by `node
serve.mjs` on **:8123** — nothing reads them any more, so they can be deleted
whenever you are happy with the ported pages. Two things move when they go:
`site.css` and `nav-icons.css` into `src/styles/`, and `public/` is already
shared. `terranova.html` and `echoid.html` are separate one-off demos with their
own stylesheets, not part of this site, and were left alone.

Two consequences, both in `vite.config.ts`:

- `publicDir` points at the **root** `public/`, so `/bg.mp4` and `/assets/*` are
  the same files both versions serve;
- `server.fs.allow` lets `__root.tsx` import `site.css` and `nav-icons.css` from
  the repo root, so the design cannot drift between the two while the port runs.
  Those two files move into `src/styles/` when the last `.html` page is gone.

## Running it

There is one process. TanStack Start *is* the backend — SSR, server functions
and server routes all run in the same server as the site, so there is no second
thing to start.

```bash
cd web
npm install
npm run dev            # http://localhost:3000 — site + server
```

That is enough for every page. The database is **Neon** (serverless Postgres,
ap-southeast-1) — there is nothing to install or run locally:

```bash
cp .env.example .env   # then paste the two Neon URLs into it
npm run db:generate    # generate the Prisma client
npm run db:migrate     # apply migrations
npm run dev
```

`.env` holds two URLs and both are needed:

| Variable | Host | Used by |
| --- | --- | --- |
| `DATABASE_URL` | `…-pooler.…neon.tech` | the app — Neon's connection pooler |
| `DIRECT_URL` | the same host without `-pooler` | Prisma Migrate |

Migrations take advisory locks that a pooled connection cannot hold, which is
why `schema.prisma` declares `directUrl` alongside `url`. `.env` is gitignored;
the credentials live there and nowhere else.

Check what is up:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"server":"up","db":"unconfigured"}   no DATABASE_URL
# {"ok":true,"server":"up","db":"up"}             database reachable
# {"ok":true,"server":"up","db":"down","detail":"…why"}
```

The database is reported, never required: with no `DATABASE_URL` every page
still renders, which is exactly the state the site is in today.

In production it is the same single process:

```bash
npm run build          # SSR build into dist/
npm start              # node .output/server/index.mjs
```

## Backend

Prisma against Neon Postgres. The client is in `src/server/db.ts`, `/api/health`
is the one endpoint so far, and the schema holds one table:

- **`ContactSubmission`** — enquiries from the contact form. The form still
  composes a mailto draft in the browser; when the server function replacing it
  lands, the submission is stored here and the email becomes a notification
  rather than the only record.

- **`CallRequest`** — every attempt the /calling demo makes to dial someone,
  written before the gateway is called and updated with the outcome. It is the
  audit trail for a page that can make real phone calls at real cost, and what
  the rate limiter counts.

### The calling demo

`/calling` lets a visitor pick a desk (university, school, hospital OPD, hotel),
type their number, and have the agent ring them. The call is placed by
`src/server/calling.ts`, never by the browser:

```
POST https://{VOXIO_GATEWAY}/plivo/outbound
headers  user_api_key   which tenant
         flow_api_key   which workflow — one key per desk
body     from-number, to-number, customs { organisation_name }
```

Both headers are credentials, which is why this is a server function: the page
sends a phone number and a desk id, and nothing else. `customs` carries the
organisation the visitor typed, which is how one desk speaks for any university
or hospital they name.

Limits: 3 calls per number per hour, 10 per IP per day, every attempt logged —
including the blocked ones, because a spike of those is the signal that someone
is using the page as a dialler.

The contact form is still a mailto draft and is next. Then editable page
content, then the auth + dashboard API.

Two ways to add server code, both in this project:

- **Server functions** — `createServerFn` from `@tanstack/react-start`, called
  straight from a component or route loader with serialization handled for you.
  This is what the contact form and the page content should use.
- **Server routes** — a `server: { handlers: { … } }` property on a route file,
  like `src/routes/api.health.ts`. Use these for endpoints called from outside
  the app, which is what the dashboard's API will be.
