# AI Assistant and VAD (Voxio Agents Dashboard): plan

Two features that build on each other:

1. **The Assistant**: an AI inside the dashboard that can read and change anything the user can (workflows, settings, voices, faces, numbers, test runs) and read all their data (sessions, transcripts, what the agent decided).
2. **VAD (Voxio Agents Dashboard)**: dashboards the user builds by talking to the Assistant. "Show me how my calls are going, split by outcome" becomes a live dashboard that pulls data from the flows by itself, can be changed at any time, and can be shared as a public link.

The Assistant comes first: VAD is one of the things it builds.

---

## 1. The Assistant

### 1.1 What it is

- A panel that opens from anywhere in the dashboard (a button in the shell, and ⌘K / Ctrl+K). It knows which page and flow you are on.
- A chat with an agent that plans in steps, calls tools, shows what it did, and asks before doing anything that matters.
- Model-agnostic: one tool registry, with adapters per provider (Anthropic, and OpenAI-compatible APIs such as OpenRouter and Groq, which cover GPT, Gemini, Llama and others). We try several models and pick per task. Runs on our server with our own keys; keys never reach the browser.

### 1.2 What it can do: the tool catalog

Every tool is a thin wrapper over a server function that already exists (or one we add), so the Assistant can never do more than the logged-in user can. Same auth, same checks.

| Area | Read | Write |
|---|---|---|
| Flows | list, get one (full doc) | create, duplicate, rename, delete, rotate key |
| Workflow | get graph, validate | add/remove/rewire steps, edit any step's settings, apply a template, tidy layout |
| Prompts | read any prompt | rewrite / edit a prompt (shown as a diff) |
| Voice | read STT/TTS, list saved voices | change provider/model/voice/any field, save as preset |
| Behaviour knobs | read all | change any knob (turn-taking, inactivity, pipeline…) |
| Avatar | list faces, read looks | add a look, set labels/usage, upload a face (from a file the user drops in) |
| Numbers & calls | list numbers | attach a number, place a test call (asks first) |
| Webhook / integrations | read | set URL, send a test, redeliver |
| Knowledge | list bases and sources | add sources, re-index |
| Sessions | list, filter, read transcript, data lines, recordings metadata | none (sessions are history) |
| Tests | read results | run a chat test against a flow and read the replies |
| Analytics | aggregate over sessions (counts, durations, outcomes, any field the agent decided) | none |
| VAD | read dashboards | create / edit / delete dashboards and widgets, share/unshare |

### 1.3 Safety and trust

- **Reads run freely. Writes are proposed first.** The Assistant shows a change card ("Change Speed 0.95 → 1.0 on 山本健二", or a workflow diff) with Apply / Edit / Skip. A per-conversation "apply without asking" switch exists for small changes. Deletes, key rotation, placing calls and public sharing always ask.
- **Everything is undoable.** Each applied change writes a version (flow snapshot before/after) into a `ChangeLog` table; the change card keeps an Undo button, and a History list per flow can roll back any step.
- **Workflow edits are validated** with the existing validator before saving; the Assistant sees the issues and fixes them.
- **Scope.** Tools only see the current user's account. Session data and transcripts sent to the model are trimmed to what the task needs.

### 1.4 How it works, technically

- `POST /api/assistant` streams (server-sent events): text, tool calls, tool results, proposed changes.
- Server loop: model → tool call → run server function as the user → result back to model → … until done or a write needs approval (the loop pauses, the UI shows the card, approval resumes it).
- Conversations stored in Neon (`AssistantThread`, `AssistantMessage`) so they survive reloads; one thread per task, listed in the panel.
- Context given to the model: current page + flow, a compact account summary, the tool catalog, and our product vocabulary (what a "Say step" is, what knobs mean). Long data (sessions) is fetched by tools, not stuffed into the prompt.

---

## 2. VAD: Voxio Agents Dashboard

### 2.1 The idea in one example

> "I have a calling agent for a clinic. Show me how calls are going: how many book an appointment, how many ask for a human, and what people complain about."

The Assistant:

1. **Looks at the data**: reads the flow and recent sessions. Sees the agent currently only produces `speak` and `hangup`, so "booked" and "complaint" aren't recorded anywhere.
2. **Proposes a workflow change**: add fields to the AI step's "What it decides": `outcome: booked | callback | human | other`, `complaint: text`. Shows the diff, the user applies.
3. **Proposes a dashboard**: KPI tiles (calls, booked %, asked for human %), a daily chart by outcome, a table of complaints with links to the call, a filter by date and number.
4. **Builds it**, and it starts filling from the next calls (optionally back-filling old calls by re-reading their transcripts with an AI pass, which the user approves because it costs tokens).
5. **Iterates live**: "split by doctor", "make the chart weekly", "hide test calls" all change the dashboard in place.
6. **Shares it**: "make a link for the clinic owner" gives a read-only public URL showing only that dashboard.

### 2.2 Where the data comes from

The key point: **the workflow decides what gets measured**. Every value an AI step decides (its "What it decides" fields) and every extra key a step sends (like `frame` today) is already in the session stream. We make it first-class:

- **Session fields**: when a session is saved, collect all decided values and data lines into `session.fields` (JSON), next to transcript and duration. Today's work (saving data lines with test transcripts) is the start of this; live calls need the same from the voice server's session record.
- **Built-in fields** always available: start time, duration, channel, number, status, flow, turns, test/live.
- **Derived fields** (optional, AI): computed after the call by reading the transcript ("sentiment", "topic"). Defined once per dashboard, run on new sessions automatically, back-fill on request.
- **External data** via connectors (2.4).

### 2.3 What a dashboard is

A dashboard is a JSON document, so the Assistant can write it and the user can edit it by hand too:

```jsonc
{
  "title": "Clinic calls",
  "flows": ["vk_…"],                  // which flows feed it
  "filters": [{ "field": "startTime", "kind": "dateRange", "default": "30d" }, { "field": "number", "kind": "select" }],
  "widgets": [
    { "type": "kpi",   "title": "Booked", "query": { "metric": "share", "where": { "fields.outcome": "booked" } } },
    { "type": "chart", "title": "Calls by outcome", "query": { "metric": "count", "by": "day", "split": "fields.outcome" }, "chart": "stackedBar" },
    { "type": "table", "title": "Complaints", "query": { "select": ["startTime", "fields.complaint"], "where": { "fields.complaint": { "exists": true } } }, "link": "session" }
  ],
  "layout": [ /* grid positions, set by drag in the editor */ ],
  "share": { "public": false }
}
```

- **Widget types (v1)**: KPI tile, line/bar/area/stacked chart, pie/donut, table (with click-through to the session replay), text/markdown note, funnel, word list.
- **Queries** run on our server against Neon, never in the browser: a small safe query language (metric, group by, split, where, time bucket) compiled to SQL over sessions and their `fields`. No raw SQL from the model or the user.
- **Live**: widgets refresh on an interval and when the Assistant changes the dashboard; edits by chat and by drag both save a new version (undoable).
- Built from the components we already have (bklit charts, TableCard, M3 chips and filters).

### 2.4 Plugins and connectors

So a dashboard can show more than call data:

- **Built-in plugins**: Shopify (orders next to calls), Google Calendar (appointments booked vs calls), Sheets (export/import), webhooks in.
- **MCP connectors**: the user connects any MCP server (their CRM, database, ticketing). The Assistant can then use its tools to read data, and a widget can be backed by an MCP tool call (cached, on a schedule).
- Connector credentials stored encrypted per account; public dashboards only ever see the cached results, never the connector.

### 2.5 Sharing

- Each dashboard can get a **public link** (`/v/<random id>`), read-only, no login. Optional: password, expiry, hide filters, hide transcripts/PII (names, numbers masked).
- The public page is served from a snapshot of the dashboard spec and runs the same server-side queries, scoped to that dashboard's flows and filters only.
- Revoke at any time; a view counter shows if it's being used.

---

## 3. Data model (new tables in Neon)

| Table | Purpose |
|---|---|
| `AssistantThread`, `AssistantMessage` | Conversations, tool calls, approvals |
| `ChangeLog` | Every applied change: who/what (user or assistant), before/after, for undo and history |
| `SessionField` (or `fields` JSON on Session + GIN index) | Values the agent decided per session, queryable |
| `DerivedField` | AI-computed fields defined per dashboard, with run status |
| `Dashboard`, `DashboardVersion` | The spec and its history |
| `DashboardShare` | Public links: token, options, views, revoked |
| `Connector` | Plugin/MCP connections, encrypted credentials, cache |

---

## 4. Phases

| Phase | Ships | Depends on |
|---|---|---|
| **1. Assistant core** | Panel, streaming chat, read tools for everything, write tools with approve/undo for flow settings, voice, knobs, prompts | ChangeLog |
| **2. Assistant: workflow + tests** | Workflow editing tools with diff preview on the canvas, chat-test tool so it can try its own changes | Phase 1 |
| **3. Session fields** | Decided values and data lines saved for live and test sessions; field explorer in Sessions | Voice server session record exposes them |
| **4. VAD v1** | Dashboards from chat: KPI/chart/table widgets, filters, safe query engine, live refresh, drag layout, versions | Phases 1 and 3 |
| **5. Sharing** | Public links with masking, password, expiry | Phase 4 |
| **6. Derived fields** | AI-computed fields, back-fill with cost preview | Phase 4 |
| **7. Plugins and MCP** | Shopify/Calendar/Sheets, generic MCP connector, MCP-backed widgets | Phase 4 |

---

## 5. Decisions

Decided (2026-10-10):
- No pricing yet; our own keys; not tied to one model (try several).
- Outside connectors / MCP are out of scope for now.
- Live session data: later we can read the agent's state machine at any point and extract fields from it; decided later.
- Order: build the Assistant first, starting with what it can read (section 6).

Still open:

1. **Model and billing**: Claude for the Assistant (recommended), on our key with a per-account budget, or the user's own key?
2. **Approval default**: ask before every write (recommended to start), or let users switch to auto-apply small changes?
3. **Live session fields**: the voice server needs to include decided values / data lines in its session record (or post them to us). Backend change in vx-backend-monorepo: who owns it?
4. **Public dashboards and PII**: mask phone numbers and transcripts by default on public links?
5. **MCP**: run connectors from our server (simplest, we hold credentials) or let users point at remote MCP servers only?
6. **Where VAD lives**: a new top-level "Dashboards" section in the sidebar (recommended), with each dashboard also linkable from its flows.


---

## 6. Read model (Assistant v1)

What the Assistant can read, and exactly how. Writes come after this is solid.

### 6.1 Principles

1. **Same access as the user, nothing more.** Every read runs on our server as the logged-in user, through the same checks the pages use. The model never gets a database handle or raw SQL.
2. **Outline first, detail on demand.** Big things (an account, a workflow, a month of sessions) are read as a short outline first; the model then asks for the parts it needs. This keeps answers fast, cheap and inside any model's context window.
3. **Small, targeted queries.** Each tool queries only what it needs, never the whole-account load the pages use (that is what made the Avatar page slow).
4. **Bounded results.** Every result has a size cap (about 6,000 tokens). Lists page with a `cursor`; long text is cut with `truncated: true` and a way to read the rest.
5. **Secrets never leave the server** (6.4).
6. **The same for every model.** Tools are defined once (name, description, JSON Schema input, handler) and translated per provider.

### 6.2 What it can read: the read tools

**Context (given automatically, not a tool)**: the page the user is on, the open flow (key and name), the selected workflow step, the open session, today's date and the user's time zone.

| Tool | Input | Returns |
|---|---|---|
| `account_overview` | none | Name, counts (flows, sessions last 30 days, faces, saved voices, numbers, knowledge bases), list of flows (key, name, sessions, minutes, channels), saved voice names, face labels |
| `list_flows` | `query?`, `connection?`, `sort?`, `cursor?` | Flow summaries (the All flows table row) |
| `get_flow` | `key`, `parts?`: settings, voice, knobs, faces, numbers, webhook, knowledge, integrations | Only the requested parts of the flow. Knob values come with their label and default |
| `get_workflow` | `key`, `view`: outline / full | **Outline**: each step's id, type, label, one-line summary, where each output goes, issues. **Full**: the engine JSON |
| `get_step` | `key`, `step` | One step in full: all settings, prompts, what it decides, what it reads, connections in and out |
| `validate_workflow` | `key` | The editor's own issue list (errors, tips) |
| `list_voices` | `kind?` | Saved STT/TTS presets: name, provider, model, voice, which flows use them |
| `list_faces` | none | Faces: id, label, detector, frames, which flows use them as looks |
| `list_numbers` | none | Owned numbers and which flow each is attached to |
| `list_knowledge` | none | Knowledge bases and their sources (status, chunks) |
| `search_sessions` | `flow?`, `from?`, `to?`, `channel?`, `status?`, `test?`, `text?`, `limit` (≤50), `cursor?` | Compact rows: id, flow, when, channel, caller, duration, status, turns, test flag, first caller line |
| `get_session` | `id`, `include?`: transcript, data, timing, web_actions; `turns?`: range | One session: timing, tokens, and the requested parts. Transcripts page by turn range |
| `session_stats` | `flows?`, `from`, `to`, `by?`: day / week / channel / status / flow, `metrics`: count, minutes, avg_duration, completion_rate, turns | Numbers computed on the server, never by the model counting rows |
| `list_deliveries` | `key`, `limit?` | Webhook deliveries: event, status, time, attempts (no bodies unless asked for one) |
| `explain` | `topic`: a knob key, a step type, a provider field | Our own help text and allowed values, from the registry and knob catalog, so the model uses our vocabulary and valid values |

Later (decided separately): `get_session_state` to read the agent's state machine for a live or past session.

### 6.3 How each read works

- **Flows, workflow, steps**: read the flow row from Neon by key and user, then shape it with the same code the editor uses (`toGraph`, the registry's labels and summaries, the validator). The outline is what the canvas cards show, so the model sees what the user sees.
- **Sessions**: direct Prisma queries on the sessions table with the filters as WHERE clauses, newest first, keyset paging (`cursor` = last start time and id). Text search runs over the transcript column on the server.
- **Stats**: one SQL aggregate per call (`GROUP BY` day / channel / status / flow). The model gets totals and series, not raw rows.
- **Transcripts**: returned as numbered turns (`{n, who, text}`) plus data lines (`{n, data}`), so the model can say "turn 14" and ask for "turns 10–20".
- **Help (`explain`)**: static, from `lib/workflow/registry.ts` and `lib/dashboard/knobs.ts`, so it never drifts from the UI.
- **Caching**: results are cached for the length of one Assistant reply, so a plan that reads the same flow three times hits the database once.

### 6.4 Never readable

- The account API key, flow keys beyond their first 8 characters (enough to tell flows apart), webhook secrets.
- Credentials inside provider configs: any field named like `api_key`, `key`, `token`, `secret`, `password` is replaced with `"•••"` before it leaves the server.
- Other users' anything.
- Recording and video files themselves (the model gets that a recording exists and its length, not the media).

### 6.5 What the user sees

- Each read shows as a quiet line in the chat ("Read workflow outline of 山本健二", "Searched 42 sessions, last 7 days"), expandable to show the exact input and result, so it is never a black box.
- Reads never ask for approval.

---

## 7. Build plan: Assistant v1 (read-only)

Decided 2026-10-10: transcripts and numbers go to the model as they are; start with OpenRouter, Groq and Anthropic; `@` can mention anything (a flow, a step, a session, a face, a voice, a number, a knowledge base).

| Step | What | Files |
|---|---|---|
| 1 | Redaction helpers (secrets, key masking) | `src/server/assistant/redact.ts` |
| 2 | Read tools: registry (name, description, JSON Schema, handler), Prisma queries, size caps, paging | `src/server/assistant/tools.server.ts` |
| 3 | Model adapters: Anthropic Messages, OpenAI-compatible (OpenRouter, Groq); one internal message format; list of models | `src/server/assistant/models.server.ts` |
| 4 | Agent loop: model → tools → model…, max steps, per-reply cache, emits events | `src/server/assistant/loop.server.ts` |
| 5 | HTTP: `POST /api/assistant` streams events (SSE); `GET /api/assistant?mentions=q` searches things to @-mention; `GET /api/assistant?models=1` | `src/routes/api.assistant.ts` |
| 6 | Panel: opens from the shell button and Ctrl+K, model picker, `@` autocomplete with chips, streaming reply, tool lines you can expand, formatted answers, page context | `src/components/assistant/*`, `src/styles/assistant.css` |
| 7 | Conversations kept in the browser for v1 (moved to Neon with writes in v2) | panel |

Env: `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` (any one is enough; models without a key are hidden).

Next (v2): write tools with change cards, approve/undo, ChangeLog table, threads in Neon.

---

## 8. Write model (Assistant v2)

Decided 2026-10-10: the Assistant can change flows (workflow, step settings, voices, behaviour settings, name, webhook, looks). Sessions stay read-only, always.

### 8.1 How a change happens

1. The model never writes directly. It calls a **propose** tool. The server builds the complete new value from the flow as it is now, checks it (the workflow goes through the editor's validator; settings are checked against their allowed values), and stores it as a **pending change**. Invalid proposals come straight back to the model as errors to fix.
2. The chat shows a **change card**: a title, each change as *before → after* (for workflows: steps added, removed, rewired, and each setting changed), and **Apply** / **Discard**.
3. **Apply** saves through the same code path the dashboard's own Save uses (`applyFlowPatch`), so the voice backend and the dashboard stay in sync.
4. Before applying, the server checks the flow hasn't changed since the proposal was made (someone saved in the editor meanwhile). If it has, the card says so and asks the model to propose again.
5. Every applied change keeps the exact previous values: **Undo** on the card puts them back (with the same "has it changed since?" check).

### 8.2 What can be proposed

| Tool | Changes |
|---|---|
| `propose_flow_settings` | Flow name, webhook URL, any behaviour knob (validated against the knob catalog) |
| `propose_voice` | Speaking or listening setup: fields merged into the current config |
| `propose_step_settings` | Any setting of one workflow step (prompt, model, what it decides, interruption…) |
| `propose_add_step` | A new step of any type, with defaults from the registry, placed after a step (or a branch path) and optionally continuing to another |
| `propose_remove_step` | Removes a step and every connection to it |
| `propose_connections` | Connect or disconnect two steps (normal next, or a branch path) |
| `propose_looks` | The flow's avatar looks (face, label, when to use it) |

Never: sessions, recordings, account key, deleting flows, numbers, anything on another account.

### 8.3 Storage

v2: pending and applied changes live in server memory (lost on restart; a lost pending change just needs re-proposing). Next: an `AssistantChange` table in Neon for a per-flow change history and undo across restarts.

---

## 9. VAD: Voxio Agents Dashboard (full plan, 2026-10-10)

A VAD is a **JSON spec** for a dashboard about one or more flows. It is made **only when the user asks**, by Ask Voxio, from what the workflow really produces. No pipelines, no guessed data.

### 9.1 The flow

1. **Ask.** The user asks Ask Voxio for a dashboard ("how are my booking calls going?"). Ask Voxio may *suggest* one when it fits; it never creates one unasked.
2. **Check the workflow.** Ask Voxio reads the flow's workflow and lists what data it produces per call:
   - built-in: date, time, duration, channel, status, turns, caller, test or real;
   - agent fields: what each AI step decides ("What it decides") and what each step outputs.
   It compares that to what the dashboard needs.
3. **Suggest workflow changes (if needed).** Missing data → a normal flow change card ("Add `outcome` to What it decides in the AI step"), Apply / Undo. Nothing changes without the user.
4. **Generate the VAD JSON.** A dashboard change card: what widgets, on which fields. Apply saves it.
5. **Use it.** The dashboard page renders it, with live numbers.
6. **Change it any time.** By asking ("make it weekly", "add a table of calls that asked for a human") or by dragging and resizing widgets. Every change is a new version; Undo goes back.

### 9.2 Where the numbers come from

- **Built-in fields:** the sessions table, as today.
- **Agent fields:** read from the agent's state per session (the state machine, §5), once that access exists. Until then a VAD can use built-in fields only; widgets on agent fields show "Waiting for agent data" instead of numbers.
- A field only exists for calls made after it was added to the workflow. Widgets on it show "since <date>". Older calls are never filled in.

### 9.3 The JSON

```jsonc
{
  "title": "Booking calls",
  "flows": ["vk_…"],
  "range": "30d",                            // default date range; the viewer can change it
  "filters": ["channel", "outcome"],         // filter chips shown on top
  "widgets": [
    { "id": "w1", "type": "kpi",   "title": "Calls",    "metric": { "op": "count" } },
    { "id": "w2", "type": "kpi",   "title": "Booked",   "metric": { "op": "share", "where": { "outcome": "booked" } } },
    { "id": "w3", "type": "chart", "title": "Calls by outcome", "chart": "stacked",
      "metric": { "op": "count" }, "by": "day", "split": "outcome" },
    { "id": "w4", "type": "table", "title": "Asked for a human",
      "where": { "asked_for_human": true }, "columns": ["startTime", "duration", "caller"], "limit": 20 }
  ],
  "layout": [ { "i": "w1", "x": 0, "y": 0, "w": 3, "h": 2 }, { "i": "w2", "x": 3, "y": 0, "w": 3, "h": 2 } ]
}
```

- **Widgets:** `kpi` (number, with change vs the previous period), `chart` (line, area, bar, stacked, donut; bklit), `table` (sessions, click → replay), `text` (a note).
- **Metrics:** `count`, `share` (percent of calls matching `where`), `avg` / `sum` (of a number field, e.g. duration), `distinct` (e.g. callers).
- **Grouping:** `by` (hour, day, week, month, or any field), `split` (a second field, for stacked charts).
- **Filters:** `where` per widget; `range` and `filters` for the whole dashboard.
- **Layout:** react-grid-layout's own format, stored in the spec.

### 9.4 How it runs

- One server function computes a widget from the spec (`runWidget(spec, widget, range, filters)`): reads the flows' sessions (and agent fields, when available), filters, groups, returns numbers. Specs are data, never code, so nothing in a spec can run.
- The dashboard page asks for each widget's numbers on open and every 60 s while visible.
- The same function answers Ask Voxio's numbers, so the chat and the dashboard always agree.

### 9.5 Ask Voxio tools

| Tool | Does |
|---|---|
| `check_workflow_data` | Lists the fields a flow produces per call (built-in + agent fields, with the step that makes each), and which a goal needs that are missing |
| `propose_dashboard` | A whole new VAD JSON → card with a preview, Apply / Discard |
| `propose_dashboard_edit` | Add, change or remove widgets, title, range, filters → card, Apply / Undo |
| `list_dashboards`, `get_dashboard` | Read existing ones (so "make it weekly" edits the right one) |

Workflow changes use the existing flow tools and cards (§8).

### 9.6 Pages

- **Dashboards** in the sidebar: the user's VADs (title, flows, last changed), and "Ask Voxio for a dashboard".
- **A dashboard page:** title, date range, filter chips, the widget grid. Edit mode: drag and resize (react-grid-layout), remove a widget, rename. "Ask Voxio" opens the panel with this dashboard @-mentioned.
- Each flow's Overview links to the dashboards that use it.

### 9.7 Sharing (when asked)

- "Share" makes a read-only link `/v/<token>`, no login: only that dashboard, its numbers computed on the server.
- Caller numbers hidden by default; optional expiry; revoke any time.

### 9.8 Storage

- `dashboards` table: id, user, title, spec (JSON), created, updated.
- `dashboard_versions`: id, dashboard, spec, by (user or Ask Voxio), at, for Undo and history.
- `dashboard_shares`: token, dashboard, options, views, revoked.

### 9.9 Build order

| # | Ships |
|---|---|
| 1 | Tables, VAD JSON + `runWidget` on built-in fields, Dashboards list and page (KPI, chart, table, text), date range and filters |
| 2 | Edit mode: react-grid-layout drag/resize (after a React 19 check), rename, remove, versions + Undo |
| 3 | Ask Voxio: `check_workflow_data`, `propose_dashboard`, `propose_dashboard_edit`, list/get, dashboard cards with preview |
| 4 | Agent fields from the state machine (when available): widgets on them switch from "waiting" to numbers |
| 5 | Share links |

---

## 10. VAD spec v1: the JSON, charts, layout, dragging and resizing

### 10.1 The whole document

```jsonc
{
  "version": 1,                        // spec format version, for future migrations
  "title": "Booking calls",
  "description": "How the clinic line is doing",   // optional, shown under the title
  "flows": ["vk_fwdjidGa"],            // one or more flows the numbers come from
  "defaults": {
    "range": "30d",                    // today | 7d | 30d | 90d | month | custom
    "compare": true,                   // KPIs show change vs the previous period
    "test": false                      // leave out test sessions
  },
  "filters": [                         // chips on top; the viewer can change them
    { "field": "channel" },
    { "field": "agent.outcome", "label": "Outcome" }
  ],
  "widgets": [ /* 10.3 */ ],
  "layout": [ /* 10.6 */ ]
}
```

Everything is data. Nothing in a spec can run code; the server validates every spec before saving (10.9).

### 10.2 Fields

| Field | Type | Notes |
|---|---|---|
| `startTime` | time | When the call started; used for "by day/week…" |
| `duration` | number (s) | Connected time |
| `channel` | category | phone, web, video, chat |
| `status` | category | completed, failed… |
| `turns` | number | Caller turns |
| `caller` | text | Masked on shared links unless the owner allows it |
| `flow` | category | When a dashboard covers several flows |
| `test` | yes/no | Test sessions |
| `agent.<name>` | from the workflow | A value an AI step decides or a step outputs (`agent.outcome`, `agent.score`). Type from the workflow (str → category, int/float → number, bool → yes/no). Only calls after it was added; widgets say "since <date>". |

### 10.3 Widgets

Every widget: `{ "id", "type", "title", "subtitle"?, "query", ...type options }`.

- **`kpi`**: one number, change vs previous period (▲/▼, `goodWhen: "down"` flips colours), optional `goal`, optional sparkline.
  `{ "id": "booked", "type": "kpi", "title": "Booked", "query": { "metric": "share", "where": { "agent.outcome": "booked" } }, "format": "percent", "goal": 0.4 }`
- **`chart`**: a bklit chart (10.5).
  `{ "id": "trend", "type": "chart", "chart": "bar", "stacked": true, "title": "Calls by outcome", "query": { "metric": "count", "by": "startTime:day", "split": "agent.outcome" } }`
- **`table`**: sessions (click → replay) or grouped rows.
  `{ "id": "list", "type": "table", "query": { "rows": "sessions", "where": { "agent.asked_for_human": true }, "sort": "-startTime", "limit": 50 }, "columns": ["startTime", "duration", "caller", "agent.reason"] }`
- **`text`**: a Markdown note.

### 10.4 Queries

```jsonc
{
  "metric": "count",          // count | share | avg | sum | min | max | distinct
  "of": "duration",           // the field for avg/sum/min/max/distinct
  "where": {                  // all must match
    "agent.outcome": "booked",            // equals
    "channel": ["phone", "web"],          // one of
    "duration": { "gte": 60 },            // gte, lte, gt, lt
    "agent.reason": { "exists": true }
  },
  "by": "startTime:day",      // startTime:hour|day|week|month, or any category field
  "split": "agent.outcome",   // second grouping (≤ 8 values, rest → "Other")
  "top": 10                   // biggest N categories, rest → "Other"
}
```
The dashboard's range, filters and `test` setting apply to every widget on top of its own `where`. Computed on our server only (10.10), cached 30 s.

### 10.5 Charts (bklit)

Bklit UI has 14 charts ([repo](https://github.com/bklit/bklit-ui)), added with `npx shadcn@latest add @bklit/<name>`. Our repo vendors only area and bar today; VAD adds the ones below.

| `chart` | bklit | Good for in VAD | Query shape |
|---|---|---|---|
| `line` | Line Chart | Trends over time | `by: startTime:*`, optional `split` (≤ 6 lines) |
| `area` | Area Chart (have) | Volume over time, stacked by category | same as line |
| `bar` | Bar Chart (have) | Compare categories or periods; `orientation: horizontal` for rankings; `stacked` / grouped with `split` | `by`, optional `split` |
| `composed` | Composed Chart | Bars + a line on one chart (calls per day + booking rate) | two queries, second as line |
| `pie` | Pie Chart | Share of a whole, few categories (≤ 6) | `by` category |
| `ring` | Ring Chart (donut) | Same, with the total in the middle | `by` category |
| `funnel` | Funnel Chart | How far calls get (greeted → asked → booked) | `steps`: ordered list of `where`s |
| `gauge` | Gauge | One number against a goal (booking rate vs 40%) | a `kpi`-style query + `goal` |
| `liveLine` | Live Line Chart | Calls happening now, updating every few seconds | `by: startTime:minute`, last 30–60 min |
| `scatter` | Scatter Chart | Relation between two numbers per call (duration vs score) | `x`, `y` fields, rows = sessions |
| `radar` | Radar Chart | Several scores per item (e.g. OSCE rubric scores per student/flow) | several `of` fields, `by` category |
| `sankey` | Sankey Chart | Paths through the workflow (which steps calls pass through) | needs per-step data from agent state; later |

Not used: Candlestick (finance), Choropleth (maps; maybe later for caller regions).
Options on any chart: `showValues`, `goalLine`, `unit`, `format` (number, percent, duration), `colors` (series → theme token, never raw hex).

### 10.6 Layout: the grid

- **12 columns**, row height 56 px, gap 16 px, react-grid-layout's own format `{ "i", "x", "y", "w", "h" }`.
- Sizes per type (grid enforces min/max; Ask Voxio uses the default):

| Type | Min (w×h) | Default | Max |
|---|---|---|---|
| kpi | 2×2 | 3×2 | 6×4 |
| gauge | 2×3 | 3×3 | 6×6 |
| pie / ring | 3×4 | 4×5 | 8×8 |
| line / area / bar / composed / liveLine | 4×4 | 6×5 | 12×10 |
| bar horizontal / funnel | 4×4 | 6×6 | 12×12 |
| scatter / radar | 4×5 | 6×6 | 12×10 |
| table | 4×4 | 12×6 | 12×16 |
| text | 2×1 | 6×2 | 12×8 |

- **Vertical compaction**: widgets float up, no holes.
- **Breakpoints**: ≥ 1200 px uses the saved 12-column layout; 768–1199 px derives 6 columns (order kept, widths scaled and clamped); < 768 px stacks one column in reading order. Only the 12-column layout is stored.

### 10.7 Dragging

- Only in **Edit mode** (viewers and shared links can't drag).
- **Drag by the widget's header** (grip ⋮⋮ on hover), never the chart or table body, so tooltips and table scrolling never start a drag.
- While dragging: the widget lifts, a tinted placeholder shows where it lands, the others slide aside (animated); release snaps to the grid.
- Keyboard: focus the grip; arrows move one cell, Shift+arrows resize.
- Each arrangement saves a version (debounced ~5 s) so Undo restores it.

### 10.8 Resizing: widgets adapt, not just stretch

- Handle in the bottom-right corner (plus right and bottom edges), snapping to cells, stopping at min/max.
- **kpi**: 2×2 number + change; wider adds the label; taller adds the sparkline; ≥ 4×3 adds the goal bar.
- **charts**: redraw to the new size (each widget watches its size). Under 6 wide the legend moves below and scrolls, axis labels thin out; under 5 tall, axis labels hide (tooltips stay).
- **pie / ring**: under 4 wide the legend moves below; ring keeps its centre total.
- **bar horizontal / funnel**: shows as many bars/steps as fit, the rest collapse into "Other".
- **table**: taller shows more rows; narrow drops the lowest-priority columns (order in `columns` = priority) into a row-expand.
- **text**: reflows; scrolls when longer than the box.

### 10.9 Validation (every save, from the user or Ask Voxio)

- Known types, charts, metrics and fields only; `agent.*` fields must exist in the workflow (else the card names the workflow change needed).
- Limits: ≤ 8 series, `top` ≤ 50, table `limit` ≤ 200, pie/ring ≤ 6 slices (rest → "Other"), ≤ 40 widgets.
- Layout: one entry per widget, sizes clamped to min/max, `x + w ≤ 12`; missing entries go to the bottom at default size. Unique ids; titles ≤ 80 chars.

### 10.10 Getting the numbers (the VAD key)

- Each dashboard gets a key at creation (`vad_…`, stored hashed, rotatable, revocable).
- The page calls `POST /api/vad/<dashboard>/widget/<id>` with `{ range, filters }`, carrying the owner's login (inside the dashboard) or the VAD key (shared link).
- The server loads the **saved** spec, runs only that widget's query on Neon on the owner's behalf, scoped to the spec's flows, and returns only the result. The caller can't send a query, only pick a widget and the range/filters the dashboard offers. Read-only, rate-limited, caller masked on shared links.

### 10.11 Example

```json
{
  "version": 1, "title": "Booking calls", "flows": ["vk_fwdjidGa"],
  "defaults": { "range": "30d", "compare": true, "test": false },
  "filters": [{ "field": "channel" }, { "field": "agent.outcome", "label": "Outcome" }],
  "widgets": [
    { "id": "calls",  "type": "kpi", "title": "Calls", "query": { "metric": "count" }, "spark": true },
    { "id": "rate",   "type": "chart", "chart": "gauge", "title": "Booking rate", "query": { "metric": "share", "where": { "agent.outcome": "booked" } }, "goal": 0.4 },
    { "id": "mix",    "type": "chart", "chart": "ring", "title": "Outcomes", "query": { "metric": "count", "by": "agent.outcome" } },
    { "id": "trend",  "type": "chart", "chart": "bar", "stacked": true, "title": "Calls by outcome", "query": { "metric": "count", "by": "startTime:day", "split": "agent.outcome" } },
    { "id": "path",   "type": "chart", "chart": "funnel", "title": "How far calls get", "steps": [
        { "label": "Answered", "where": {} },
        { "label": "Asked for a time", "where": { "agent.asked_time": true } },
        { "label": "Booked", "where": { "agent.outcome": "booked" } } ] },
    { "id": "list",   "type": "table", "title": "Asked for a human", "query": { "rows": "sessions", "where": { "agent.asked_for_human": true }, "sort": "-startTime", "limit": 50 }, "columns": ["startTime", "duration", "caller", "agent.reason"] }
  ],
  "layout": [
    { "i": "calls", "x": 0, "y": 0, "w": 3, "h": 3 }, { "i": "rate", "x": 3, "y": 0, "w": 3, "h": 3 },
    { "i": "mix", "x": 6, "y": 0, "w": 6, "h": 5 },   { "i": "trend", "x": 0, "y": 3, "w": 6, "h": 5 },
    { "i": "path", "x": 6, "y": 5, "w": 6, "h": 6 },  { "i": "list", "x": 0, "y": 8, "w": 6, "h": 6 }
  ]
}
```
