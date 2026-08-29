# What changed

One session's work, in the order it happened. The short version: the site went
from a folder of static HTML to a TanStack Start app with a database and two
working live demos.

## 1. The navigation

- Every nav link is an **icon**. The page you are on shows icon + label; hovering
  any other one opens its label inline, pushing the row along.
- **Products** opens a pane out of the row — it widens and pushes the Contact
  pane right, rather than floating over it.
- Two earlier attempts are worth knowing about because they were rejected for a
  reason: a label beside the icon covered its neighbours, and a label below the
  bar was legible but not what was asked for. The current one moves the row.
- `nav-icons.css` / `nav-icons.js` are shared with the old static pages, so both
  versions look identical while they coexist.

## 2. The port

The static site became an app in **`web/`** — TanStack Start (Router + SSR +
server functions), which is also the backend. **All thirteen pages** are routes:
`/`, `/work`, `/testimonials`, `/collaborations`, `/about`, `/contact`,
`/calling` + its four subpages, `/avatar`, `/webnav`.

- Each page's own `<style>` block became `src/styles/<page>.css`.
- Shared chrome in `src/components/`: `Navbar` (switches nav by section — main
  site, calling site, and the two single-page product sites with a scroll spy),
  `GlassDefs`, `HeroVideo`, `SiteFooter`, `useReveal`.
- The Next.js scaffold that was half-started is gone.
- The `.html` files are still in the repo root and still served by
  `node serve.mjs`; nothing reads them any more, so they can be deleted whenever
  you are happy. `terranova.html` and `echoid.html` are unrelated demos, left
  alone.

## 3. The backend

- **Neon Postgres + Prisma.** `DATABASE_URL` (pooled) and `DIRECT_URL` (for
  migrations, which take locks a pooler cannot hold).
- `GET /api/health` → `{ server, db, desks }`, so "is it up" is a question with
  an answer.
- Tables: `ContactSubmission`, `CallRequest`, `RoomSession`.

## 4. The calling demo (`/calling`)

The old console asked visitors for an API key and a gateway address. It is gone.
Now: pick a desk, type a number, press **Call me**, and the phone rings.

- **Four desks** — university, school, hospital OPD (the agent plays the
  patient), hotel. One flow key serves all four: it is the generic telephony
  key, which runs the call graph we send, so a desk is a script rather than a
  workflow registered on the gateway.
- The call is placed by a **server function** — both gateway headers are
  credentials and never reach the browser.
- The university graph is ported whole from the deployment that runs it; the
  other three scripts are in `src/server/voice/deskScripts.ts`.
- Guards: E.164 normalisation, 3 calls per number per hour and 10 per address
  per day (configurable), every attempt logged including blocked ones.
- The conversation appears in the panel when the call ends, and
  **`npm run calls`** prints recent calls with their transcripts.

**Two bugs found the hard way, both worth remembering:**

- A bare ten-digit number passed our validation and then failed at the carrier,
  which reports it as a `500` with no body. Ten-digit Indian mobiles now get
  `+91` prefixed, and the page shows the number it actually dialled.
- The gateway refuses a call graph whose `webhook-url` is an empty string. It
  must be an absolute, publicly reachable URL — `PUBLIC_URL` in `.env`.

## 5. The avatar demos (`/avatar`)

A live WebRTC conversation in the page — no install, no phone call.

- **Five demos**: Interview practice and Ask about Voxio (audio), plus
  **Mr Muthu**, **Mr Cheryl** and **Mr Nair** with a rendered face.
- The transport is ported from `tempp`'s `InterviewRoom`: ICE with a retry, the
  data channel created before the offer, gathering awaited, reconnect with
  backoff.
- The three roleplay graphs are copied whole from the deployments, with two
  edits each — the imports, and the webhook.
- Two video panes with four layouts (split / focus / them / you). Both stay
  mounted and decoding always; hiding one uses opacity, never `display:none`.
- Sessions are capped (five minutes, visible countdown) and limited per address,
  because these are metered GPU minutes.

## 6. The website-navigation demo (`/webnav`)

The agent fills a demo-request form while it talks — the claim the page makes
("it does not point at the button, it takes you there"), done rather than said.

- The graph is ported from tempp's web-actions demo. The model returns speech
  with `<|web_action|>` markers and one action per marker; the runtime speaks up
  to a marker, then pushes the action down a `web_actions` data channel.
- Each action waits for a **speak→silence transition** before it runs, so the
  visitor hears "let me put your name in" and then watches it happen. The ack
  goes back when the action has visibly finished, because the server holds the
  next speech segment until it arrives.
- **Scoped to the panel.** The reference runs actions in an iframe; here they run
  on the page, resolved against the demo container only. A hallucinated selector
  fails as one dud action rather than reaching the rest of the site.
- Four verbs: focus, fill_field, click, scroll_to. Text is typed a character at
  a time — a value that appears instantly reads as a page reload. Nothing is
  submitted anywhere, and the graph carries no webhook: what someone types into
  a form they never sent is theirs.
- The action log beside it is the receipt — pending, done, failed.

## 7. Where things run

| | |
| --- | --- |
| `cd web && npm run dev` | the site **and** the backend, on :3000 |
| `npm run calls [n]` | recent demo calls and their transcripts |
| `npm run build` / `npm start` | SSR build, then serve it |
| `node serve.mjs` (repo root) | the old static site on :8123 — no longer needed |

Servers, and which is which: `call.voxio.in` places phone calls,
`voice.voxio.in` terminates browser WebRTC, `gpu.voice.voxio.in` does the same
for sessions that render a face. None is derivable from the others.

`PUBLIC_URL` must be an absolute public URL for any transcript to come back. In
development that means a tunnel (`ngrok http 3000`), and changing it means
changing `.env` and restarting — `vite.config.ts` reads it to allow the host,
or the gateway's posts are rejected as an unknown `Host` and look like they
never arrived.

## 8. Not done yet

- **The interactive rail on the roleplays** — Mr Cheryl's shirt, receipt and
  phone appearing on a counter, the escalation form, the mood banner, Mr Nair's
  pose chips, the running score. The model already returns `frame`, `actions`
  and `score` per turn and the webhook already stores turns, so this is reading
  three more fields and drawing them.
- **Live turns on the phone demo.** They work on the browser demos; the same
  parser produced nothing on a call, which points at something specific to the
  telephony payload.
- **The contact form** still opens a mailto draft. `ContactSubmission` exists
  and is empty, waiting for the server function that replaces it.
- **Auth, and a page to read sessions back.** `npm run calls` is the stand-in;
  a web view of real phone numbers and conversations needs a login first.
