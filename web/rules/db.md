# Database rules

Read this before any change that reads or writes data, changes the schema, or adds a cache.
`CLAUDE.md` §3 is the summary; this is the detail.

## Rule 0. Claude never touches the database

- No reads, writes, scripts, `psql`, `prisma studio`, or any `prisma` CLI command, not even
  `migrate status`. The database may be production.
- Write the migration and the code. Then give the user the exact commands and ask them to
  run them:

  ```
  npm run db:migrate        # applies pending migrations (prisma migrate deploy)
  npm run prisma:generate   # regenerates the client from the schema
  ```

  Then they restart the dev server.
- Until they have run them, typecheck errors about missing fields are expected. Say that
  plainly in the handover. Don't hide them, and don't work around them with `any`.

## Rule 1. One way in: Prisma

- **Next.js:** `import prisma from "@/lib/prisma"`. **Nest:** `PrismaService`. Both sit on
  a shared pool, so never create another `PrismaClient`, `pg.Pool` or `postgres()` client.
- **Banned in new code:** `@/lib/db` (raw postgres.js), `$queryRaw`, `$executeRaw`,
  `$queryRawUnsafe`. About 91 legacy files still import `@/lib/db`. Don't add to them. When
  you are already editing one of those call sites, move it to Prisma if the change is
  contained.
- **The only exception:** a query Prisma can't express (full-text search, window ranking).
  It lives in a named function in `lib/<domain>/`, with a one-line comment saying why it is
  raw. Never inline in a route or component. Always parameterised; never build SQL with
  string concatenation.

## Rule 2. The schema has one home, and migrations are written by hand

- **Schema:** `apps/api/prisma/schema.prisma`.
- **Migrations:** `apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_<snake_name>/migration.sql`,
  with the timestamp after the newest existing folder. Never add to the old
  `migrations/*.sql` (history up to `032_...`).
- Write the SQL by hand to match the schema change exactly. Then the user runs
  `npm run db:verify` (`scripts/verify-migrations.mjs`), which proves the migrations
  reproduce the schema. Prisma's own diff has produced unreplayable SQL here before.
- **Never edit a migration that has been applied.** Fix it with a new one.
- **Naming:** models are PascalCase singular (`InterviewMeetingNote`), tables snake_case
  plural through `@@map("interview_meeting_notes")`, and columns snake_case through
  `@map("submitted_at")`. Fields stay camelCase in code.
- Every model gets `id`, `createdAt` (`@default(now())`), and `updatedAt` (`@updatedAt`)
  when rows change.

## Rule 3. Changes are additive and safe on live data

The database is shared and may be production, so a migration must not break the code
running against it before and after it lands.

- **Add, don't change.** A new column is nullable or has a `DEFAULT`. Never add a
  `NOT NULL` column without a default to a table that has rows.
- **Backfill in the same migration** when old rows need a value. For example,
  `UPDATE ... SET attended = true` after adding `attended`.
- **Rename or remove in steps (expand, then contract):** add the new column, write to both,
  switch reads, and only drop the old one in a later change once nothing uses it. Never
  `DROP COLUMN` or `DROP TABLE` as part of a feature unless removing it is the request.
- **Big tables:** create indexes `CONCURRENTLY` in a migration of their own, and avoid
  rewrites that lock the whole table.
- **Foreign keys:** choose `onDelete` deliberately. `Cascade` for owned children (a
  meeting's notes), `SetNull` for references that may outlive their target, `Restrict` for
  money and audit rows.

## Rule 4. Ownership is part of the query

- Scope every read and write by its owner **in the same query**:
  `where: { id, organizationId }`, never fetch-then-check.
- For updates and deletes use `updateMany` or `deleteMany` with the owner in `where`, and
  treat `count === 0` as not found. Or check ownership in the same `findFirst` that
  precedes the write, inside a transaction.
- Never trust an id from the client to mean "mine". The session or a signed token decides
  who is asking.
- Unauthenticated access (meeting codes, manager links) uses a signed or HMAC key that is
  checked before any row is read, as `checkSeatKey` does.

## Rule 5. Data stays correct under concurrency and retries

- **Uniqueness lives in the database,** not in code. Add a `@@unique` for every "only one
  per" rule (one note per meeting per author), then use `upsert` against it. A
  check-then-insert races.
- **Several writes that must succeed together go in one transaction:**
  `prisma.$transaction([...])`, or the interactive form when a later write depends on an
  earlier read. Keep transactions short: never `await` a network call (email, LLM, R2,
  Redis) inside one.
- **Idempotent endpoints:** a retry of the same request must not double a charge, a grant,
  an email or a round move. Use a unique key (request id, `(entity, period)`), or check the
  state you are moving from in the `where` (`where: { id, status: "pending" }`).
- **Read your write, don't trust a cache:** decisions (may this person submit? is this round
  decided?) read the database, not Redis.

## Rule 6. Money and credits are a ledger

- A balance is the sum of ledger entries. Never a number edited in place.
- Every charge, grant and refund writes an entry in the same transaction as the action it
  pays for, through the service that owns it.
- Amounts are integers in the smallest unit (paise, credits). Never floats.
- Ledger and audit rows are never updated or deleted. A correction is a new entry.
- Prices and costs are named constants defined once (`CLAUDE.md` §4), and changes are
  written down in `product.md`.

## Rule 7. Queries are lean

- **`select` only what the caller needs,** especially on wide tables (resumes, candidates).
  Never return whole rows to the browser. Map them to a response shape first.
- **No N+1:** no query inside a `.map` or loop. Use `include`/`select` relations, a single
  `findMany({ where: { id: { in } } })`, or `Promise.all` for independent queries.
- **Every list is paginated** (`take` with a cursor or `skip`), with a stable `orderBy`.
  Never an unbounded `findMany` on user data.
- **Index what you filter and sort by.** Every foreign key and every `where` plus `orderBy`
  pair on a hot path gets an `@@index`. Add the index in the same migration as the query
  that needs it.
- Counting for a badge uses `count`, not `findMany().length`.

## Rule 8. Types and values

- **Time:** store `DateTime` in UTC (`timestamptz`). Convert to local time only on screen.
- **Status fields:** a `String` column validated against an exported `as const` list in
  `lib/<domain>/` (as `VERDICTS` is). Never a free string, and never two places listing the
  values.
- **JSON columns** only for data that is read and written as a whole and never filtered on.
  Anything you filter by becomes a column.
- **Text from users** is trimmed and length-capped before it is written (as `evidence` is
  capped at 2000).
- **Nullable means unknown,** not "empty string". Pick one and keep it.

## Rule 9. Redis is a cache and a message bus, never the truth

- Anything that must survive is in Postgres. Redis holds presence, live room state,
  rate limits and caches, each with a TTL.
- Every Redis key has a TTL and is listed in the inventory in `lib/redis.ts`.
- Use the right client: `getRedisRealtimeClient()` for meetings and sessions (longer
  timeout, retries), and the cache client for best-effort cache that fails fast.
- A Redis failure degrades the feature (slower, or not live). It never loses saved data and
  never lets a check pass that the database would refuse.

## Rule 10. Personal data, retention and deletion

- Store only what the feature needs. Recordings, transcripts, resumes and chat are personal
  data.
- Everything personal has a retention period as a named constant (for example
  `MEETING_RETENTION_DAYS`) and a sweep that removes it, written down in `product.md`.
- Deleting a file in storage (R2) also marks or clears its row in the same flow, so neither
  points at nothing.
- Secrets and tokens are never stored in plain text where a hash or HMAC will do, and never
  logged. Log ids, not personal fields.

## Rule 11. Errors say why

- Turn known database failures into a reason the user can act on: a unique violation
  (`P2002`) becomes "That name is already taken", and not found (`P2025`) becomes a 404 with
  what was missing. Use `HiringError` or the domain's error type.
- Never return the raw Prisma message to the browser. Log it on the server with the route
  name.

## Checklist before shipping a data change

1. Is every query through `@/lib/prisma` or `PrismaService`, with no raw SQL in a route?
2. Is the migration hand-written, additive, backfilled, and named after the newest folder?
3. Does each query carry the owner in its `where`?
4. Is every "only one" rule a `@@unique`, and is every multi-write a short transaction?
5. Can the request be retried safely?
6. Does every query use `select`, paging and an index, and avoid queries in loops?
7. If money is involved: is it a ledger entry, in integers, in the owning service?
8. Is every Redis key on a TTL and in the inventory?
9. Is there a retention rule for any new personal data?
10. Did you give the user `npm run db:migrate`, `npm run prisma:generate` and
    `npm run db:verify` to run, and say that nothing was run against the database?
