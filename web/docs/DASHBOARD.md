# The dashboard — how it works

A map of `/dashboard/*` as of 2026-09-27: routes, data flow, storage, auth, the
workflow editor, colours, and known problems. Written for a teammate (or a
Claude) picking the dashboard up cold.

---

## What it is

The customer console for building and running voice agents. The unit is a
**flow**: one agent — workflow graph, voices, behaviour knobs, avatar, vision,
knowledge bases, phone numbers, webhook and sessions. A flow is identified by
its **API key**, which is also its URL id (`/dashboard/flows/<key>`).

## Routes

```
/dashboard            beforeLoad: getMe() → redirect /login?next=… if signed out
├─ Home               greeting, 3 KPIs, 90-day usage chart, 6 recent sessions
├─ Flows              table: name, masked key, sessions, billed minutes, connections
│                     new (from template) / duplicate / delete (own flows only)
│  └─ /flows/$flowId  loads the flow once → FlowContext for every tab
│     ├─ Overview     rename, key chip + rotate, KPIs, channel split bar, sessions + replay
│     ├─ Build        Workflow · Voice · Behaviour · Avatar · Vision · Knowledge
│     └─ Connect      Numbers & calls · Webhook       (Integrations tab hidden)
├─ Voices             shared STT/TTS presets — editing one updates every flow using it
├─ Avatars            face "upload" + label + detector (s3fd / dwpose)
├─ Knowledge          knowledge bases → sources (pdf / csv / web / text …)
├─ Developers         account API key + SDK / REST snippets
└─ Settings           profile name
```

Shell (`src/routes/dashboard.tsx`):

- **Left rail**: collapses to icons (and auto-collapses inside a flow). Footer
  holds the theme toggle, Settings, user row and Log out. (The hard-coded
  "Credits 1,250" row was removed until billing exists.)
- **Flow panel**: only inside a flow; folds to icons on the workflow canvas.
- **Top bar**: breadcrumbs and a back button.
- Theme (`vx-dash-theme`) and collapse state (`vx.dash.sidebar`) live in
  `localStorage`.

## Data flow

### Client

- Every tab edits a local draft through `useDraft(keys)`
  (`src/components/dashboard/ui.tsx`) and saves from the shared `SaveBar`.
  Only changed fields are sent, as a JSON-string patch, to `patchFlow`.
- Every server function returns `JSON.stringify(Result)`; the client reads it
  with `unwire()` (`src/lib/dashboard/client.ts`).
  `Result = { ok: true, data, note? } | { ok: false, reason }`.

### Server — `src/server/dashboard/api.ts`

A flow has one of two sources:

| | Mock (own) flow | Live flow |
|---|---|---|
| Stored in | Neon Postgres, the user's own rows | Voxio backend (`VX_DATABASE`), `GET /flow?keys=all` |
| Visible to | its owner | only emails in `DASHBOARD_LIVE_EMAILS`; keys from `VOXIO_FLOW_API_KEY_*` env vars (university, school, opd, hotel, nsdc) |
| Saving | Postgres diff write | keys in `LIVE_WRITABLE` → `PUT /flow`; everything else → an "overlay" |
| Place call | records a fake session ("Not dialled — …") | real `POST {callbot}/plivo/outbound[/schedule]` |

Server functions: `listFlows`, `getFlow`, `patchFlow`, `createFlow`,
`deleteFlow`, `duplicateFlow`, `rotateFlowKey`, `sendTestWebhook`, `redeliver`,
`placeCall`, `getAccount`, `accountOp` (voices, knowledge, avatars,
integrations, key rotate), `getOverview`, `setFlowNumber`, `getNumbers`.
Every one starts with `currentUser()` and returns "Please log in again." if
there is none.

### Store — `src/server/dashboard/store.server.ts`

- `load(user)` reads the whole account in one joined Prisma query
  (`relationLoadStrategy: 'join'`) into a plain `Store { account, flows, overlays }`.
  Cached per process for 20 s (Neon is ~0.5 s a round trip).
- `mutate(user, fn)` loads fresh, runs `fn` on a copy, diffs before/after and
  writes only the changes in one `$transaction`.
- Tables mirror the backend's Mongo collections (`users`, `agents`, `flows`,
  `stt`, `tts`, `sessions`, `numbers`, `faces`) so the backend can later move
  to Postgres unchanged. Plus `knowledge_bases`, `knowledge_sources`,
  `webhook_deliveries`, `auth_sessions`.
- Runtime knobs live in `Flow.runtime` (JSON). Session replay media and web
  actions live in `CallSession.extra`.
- Numbers point at a flow by `flow_api_key` with `ON UPDATE CASCADE`, so they
  follow a key rotation.

### Auth — `src/server/auth.ts` + `session.server.ts`

- scrypt passwords (random salt, constant-time compare, decoy hash for
  unknown emails so timing leaks nothing).
- `vx_session` httpOnly cookie, 30 days; only its SHA-256 is stored in
  `auth_sessions`. `currentUser()` cached 60 s per token.
- Server-only code lives in `*.server.ts`; `auth.ts` exports only server
  functions (the production build enforces this — see `changes.md`).
- "Try the demo" signs into `demo@voxio.demo`, seeded on first open with a
  Sandbox flow, a Clinic front desk flow (180 sessions, webhook deliveries),
  3 numbers, 4 voice presets, 1 knowledge base and 2 faces.

## Main pieces

- **Workflow editor** (`src/components/workflow/`, `src/lib/workflow/`):
  n8n-style React Flow canvas — palette, canvas, settings panel.
  - Engine format: `{ nodes: { name: { type, parameters, next } } }`; the
    first key is the start node. A Branch's `mappings` each become an output
    handle. Positions live in `workflow.ui`, which the engine ignores.
  - `registry.ts` declares every node type once: Say, Listen, Filler,
    AI reply, AI decision, Guide on website, Branch, Look up knowledge,
    Search catalog, Product reply.
  - `validate.ts`: errors block saving, warnings don't. Undo/redo, Ctrl+S,
    dagre auto-layout.
- **Knobs** (`src/lib/dashboard/knobs.ts`): engine runtime settings with
  plain-English labels — conversation engine, pre-fire, turn timeouts, VAD,
  inactivity nudges, noise suppression, voice grain, lip-sync. Grouped into
  Behaviour, Voice and Avatar tabs.
- **Sessions table** (`SessionsTable.tsx`): paginated; replay per channel —
  phone recording with waveform, avatar video in sync with the caller's
  camera, or the web-action step list.
- **Charts**: vendored bklit on visx (`src/components/bklit/`).

## Styles and colours

Stylesheets imported by `dashboard.tsx`, in order: `bklit.css`,
`dashboard.css` (tokens + shell), `dashboard-ui.css`, `dashboard-theme.css`
(the "modern layer" that wins on equal selectors), `dashboard-controls.css`,
`dashboard-shell.css`, `dashboard-pages.css`, `dashboard-motion.css`.
`workflow.css` is loaded by the workflow route only.

Tokens on `.db`, re-pointed by `.db[data-theme="light"]`:

| Token | Dark | Light |
|---|---|---|
| `--db-bg` | `#03171c` | `#f3f7f7` |
| `--db-text` | `#e8f3f4` | `#0c2a30` |
| `--db-accent` | `#5ee6c8` | `#0f9e83` |
| `--db-accent-text` | `#7ff0d6` | `#0b7f69` |
| `--db-err` | `#ff7a7a` | `#d64545` |
| `--db-warn` | `#ffc670` | `#b7791f` |
| `--db-fill` | mint gradient | `#16b594 → #0f9e83` |

Translucency uses channel tokens — `rgb(var(--ink) / .07)` — so light mode
only swaps `--ink`, `--ink-text`, `--sunk`, `--glass`.

Other colours:

- Channels: phone `#5ee6c8` · web `#7aa9ff` · video `#c79bff`.
- Brand mark: conic gradient of the same three.
- Workflow nodes by group: Conversation mint/blue, AI violet/pink,
  Logic amber `#ffc670`, Knowledge green `#6fe3a1`, Shopify lime.
- Demo labels: warn amber.

The mint is written as raw `rgba(94, 230, 200, …)` ~100 times instead of
`var(--db-accent)`, and it is close to — but not the same as — the marketing
site's `#0fd6ad` / `#7ef2d2`.

## Known problems

1. **Live-flow overlay writes are lost.** `toStore()` always returns
   `overlays: {}` and `save()` never persists overlays, but `api.ts` still
   writes to them. For a live flow these say "Saved" and vanish within ~20 s:
   - behaviour / voice knobs, `stt_ref` / `tts_ref`, webhook secret and events;
   - test-webhook deliveries;
   - attaching a number — it is stripped from its old flow but the new link is
     dropped, so it ends up attached to nothing.
2. **Mocked features.** Avatar upload never sends the file; knowledge "add
   source" invents a chunk count and marks it ready; Shopify connect only
   records a name; the SDK snippets describe a package
   that isn't published. `<Mock>` renders `null`, so nothing tells the user.
3. **Dead code.** `sendTestWebhook`, `redeliver` and `rekeyFlow` exist but
   nothing calls them. The Webhook tab has no test button or delivery log.
4. **Default mismatch.** `KNOBS` defaults (`process-type: stt-native`,
   warm-up off, grain on) disagree with `blankFlow` and the schema
   (`speech-native`, warm-up on, grain off).
5. **Stale comments.** `dashboard.tsx` still says "No sign-in yet"; the
   Developers and New flow mock notes say accounts can't sign in.
