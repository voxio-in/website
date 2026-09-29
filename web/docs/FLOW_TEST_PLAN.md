# Plan: "Test" for flows in the dashboard, built on the Voxio SDK

Hand-off brief for the engineer (or Claude) building this. Read it end to end before writing code.

## Goal

From any flow in `/dashboard`, the owner can try the agent for real:

1. **In the browser**: talk to it over WebRTC, optionally see its talking avatar, watch the live
   transcript, and see any page actions it would take.
2. **On the phone**: have the flow ring the owner's own phone, from a number attached to that flow.

**Everything goes through the Voxio SDK** (`D:\vx\voice-bot-sdk`). The dashboard must not open its own
WebRTC connection, call `voicebot`'s `/rtc/*` routes, or call `callbot`'s `/plivo/*` routes directly. If
the SDK can't do something, the fix goes into the SDK (or it's listed as a gap below), not into a
dashboard workaround. This feature is also how we test the SDK itself.

---

## 1. Ground rules for this codebase

- App: TanStack Start + React 19 in `D:\vx\website\web`. Dashboard routes are `src/routes/dashboard*.tsx`;
  shared UI in `src/components/dashboard/`; server functions in `src/server/dashboard/api.ts`.
- **Server-only code lives in `*.server.ts`** and is imported only from server functions. Anything that
  holds a secret (`VOXIO_SECRET_KEY`, flow keys of other users) must never reach the browser bundle.
- **Database access is Prisma only**, no raw SQL. Account data is read and written through `load` /
  `mutate` in `src/server/dashboard/store.server.ts` (the tables mirror the backend's Mongo collections:
  `flows`, `sessions`, `numbers`…). Don't change the schema without asking; the owner runs
  `prisma db push` themselves.
- **Verify every change with** `npx tsc --noEmit -p .` **and** `npx vite build`. A dev server alone does not
  catch server/client bundling mistakes.
- The UI is for non-technical people: plain words, no JSON, no jargon ("Talk to it", not "Start RTC").
- Reuse what exists: `Icon` (animated icons, `src/components/dashboard/Icon.tsx`), `Loading` and `AiGlow`
  (`src/components/dashboard/ui.tsx`, built on `thinking-orbs` and `border-beam`), `Page`, `Notice`,
  `Dialog`, `SaveBar`, light/dark theme via CSS variables (`--db-*`, see `src/styles/dashboard.css`).
  `voice-glow` is installed and meant for exactly this (a mic-level glow).
- Log what you did in `web/changes.md` at the end (same format as the entries already there).

---

## 2. Using the SDK

### 2.1 Packages

| Package | Used for | Where it runs |
|---|---|---|
| `@voxio/client` | The browser test session (`createSession`) | Browser only |
| `@voxio/react` | `useVoxioSession` hook for the Test page | Browser only |
| `@voxio/server` | Minting session tokens, placing and following phone calls, reading session data | Server functions only |

Read `D:\vx\voice-bot-sdk\README.md` first. The relevant API, for quick reference:

```ts
// browser
const s = createSession({ token /* or flowKey, see 2.3 */, baseUrl, media: { audio: true, video, camera },
                          customs, recording: true, webActions: false })
s.on('state', …)        // idle | connecting | listening | thinking | speaking | ended | error
s.on('transcript', …)   // { role: 'user' | 'agent', text, final, turnId }
s.on('level', …)        // { user, agent } 0–1
s.on('agentVideo', …)   // MediaStream (avatar)
s.on('webAction', (msg, ack) => …)   // only when webActions: false
s.on('ended', …)        // { reason, seconds, sessionId }
s.on('error', …)        // e.code: mic-denied | no-device | insecure-context | unsupported | auth | rejected | network | connection-lost
await s.start(); s.mute(true); s.sendText('…'); await s.stop(); s.destroy()

// react
const { state, muted, error, transcript, level, agentStream, start, stop, mute, sendText } = useVoxioSession(options)

// server
const voxio = new Voxio({ secretKey, baseUrl })
await voxio.sessions.createToken({ flow, ttlSeconds, customs })
await voxio.calls.place({ flow, from, to, customs, idempotencyKey })
await voxio.calls.get(callId); await voxio.calls.cancel(callId)
await voxio.sessions.get(sessionId)   // transcript, recording, duration
```

### 2.2 Installing it into the website

The SDK is a pnpm workspace that isn't published yet. Link the built packages:

1. In `D:\vx\voice-bot-sdk`: `pnpm install && pnpm build` (produces each `packages/*/dist`).
2. In `web/package.json` add
   `"@voxio/client": "file:../../voice-bot-sdk/packages/client"`, and the same for `react` and `server`,
   then `npm install`. (Ask the owner to run the install if your permissions block it.)
3. The browser packages touch `RTCPeerConnection` / `navigator.mediaDevices`, so they must **only load on
   the client**: import the Test panel with `React.lazy(() => import(...))`, or guard with a
   mounted-only render. Never import `@voxio/client` from a module that server-renders.
4. If Vite complains about the linked packages during SSR, add them to `ssr.noExternal` (or
   `optimizeDeps.include` for the client) in `vite.config.ts`. Confirm with `vite build`.
5. After any SDK change, rebuild the SDK before testing the dashboard; the website uses its `dist`.

### 2.3 How the browser gets permission (tokens vs flow key)

The SDK's secure path is a **short-lived token** minted on our server with `@voxio/server`. The backend
routes it needs (`/v1/tokens`, `/v1/calls`, `/v1/sessions`, SDK plan items B1/B5) **don't exist yet**. So
build both, switched by env:

| Env `VOXIO_API_URL` + `VOXIO_SECRET_KEY` | Browser test | Phone test |
|---|---|---|
| **Set** (target) | Server fn `startTest` calls `voxio.sessions.createToken({ flow, ttlSeconds: 300 })` and returns only the token. Browser: `createSession({ token })`. | Server fn calls `voxio.calls.place(...)`. |
| **Not set** (today) | Server fn returns the **flow key of a flow this user owns** (checked server-side), and the browser uses the SDK's `flowKey` option. It's the owner's own key on their own dashboard, and the Developers page shows it anyway, so this is acceptable **inside the dashboard only**. | Phone card shows "Phone testing is coming soon" (see §6 for why), no call is placed. |

Wrap this in one place, `src/server/dashboard/test.server.ts`, with one exported server function per
action (in `api.ts`, as the other functions are). The browser never learns which mode it's in beyond
"token" vs "flowKey" in the response.

`baseUrl` for the browser session comes from the existing `SERVERS.voicebot` host
(`src/server/voice/servers.ts`), returned by the same server function.

### 2.4 Which flows can be tested

The voice servers only run flows that exist in the **backend's** flow store. Today that means the
"live" flows (`source: 'live'` on a `FlowDoc`, configured through `VOXIO_FLOW_API_KEY*` +
`DASHBOARD_LIVE_EMAILS`). Flows created in the dashboard (`source: 'mock'`) live only in our Postgres
tables until vx-backend switches from Mongo to them.

- `source === 'live'`: both tests enabled.
- `source === 'mock'`: show the Test page, but with a calm notice: "This flow isn't on the voice servers
  yet, so it can't take calls. It will be once your account is connected." Buttons disabled.
- Keep that check in the server function too (never hand out a key or token for a flow the backend
  can't run, or for someone else's flow).

---

## 3. What to build

### 3.1 Where it lives

- New flow tab **Test** (icon `play`), second in the flow menu right after Overview:
  add `{ path: 'test', label: 'Test', icon: 'play' }` to `FLOW_SECTIONS` in `src/routes/dashboard.tsx`
  and create `src/routes/dashboard.flows.$flowId.test.tsx`.
- A **Test** button in the workflow editor toolbar (`src/components/workflow/WorkflowEditor.tsx`) and on
  the flow overview page, both linking to the tab. If the workflow has unsaved changes, the editor button
  says "Save and test" and saves first (the test always runs the saved version).
- A small "Test" icon button on each row of the Flows list (`dashboard.flows.index.tsx`).

### 3.2 The Test page

```
┌ Test "Clinic front desk" ────────────────────────────────────────────┐
│ ┌ Talk in the browser ──────────┐  ┌ Call my phone ──────────────┐ │
│ │ [ ] Show the avatar            │  │ Your number  [+91 ……… ]     │ │
│ │ [ ] Let it see my camera       │  │ From  [+91 80456 78901 ▾]   │ │
│ │           ( Start talking )    │  │            ( Call me )      │ │
│ └────────────────────────────────┘  └─────────────────────────────┘ │
│ ┌ Live ─────────────────────────────────────────────────────────────┐ │
│ │  (orb)  Listening… 00:42          [Mute] [End]                    │ │
│ │  avatar video (when on)                                           │ │
│ │  Transcript: You / Agent bubbles, partial words greyed            │ │
│ │  [Type instead…                     ] (sendText)                  │ │
│ │  Page actions it asked for: "Click Book appointment" ✓            │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ After the call: 1m 12s · 3 turns · [View in sessions] [Copy transcript] │
└───────────────────────────────────────────────────────────────────────┘
```

**Browser card**

- "Show the avatar" appears only when the flow has avatar faces (`flow.faces.expressions.length`).
  It sets `media.video = true`.
- "Let it see my camera" appears only when the flow has vision on (`flow.running_vision_id` or
  `vision_id`). It sets `media.camera = true`.
- "Start talking" is the click that calls `start()` (the browser needs a user gesture for the mic).
- Use `useVoxioSession` from `@voxio/react`. Create the session **only after** the server function
  returns the token or flow key; recreate it if the options change while idle.
- **`webActions: false`.** The agent must not click around the dashboard. Handle `webAction` yourself:
  add a line to the "Page actions" list, then `ack('ok')` so the agent carries on as if it ran. Label the
  list "What it would do on your website".
- `recording: true`, so the test shows up in Sessions like a real call.
- Leaving the page, switching flows, or logging out must end the call: `stop()` then `destroy()` in the
  effect cleanup, and on `pagehide`.

**Phone card**

- "From" lists the numbers attached to this flow (`flow.numbers`). No attached number: show "Attach a
  number to this flow to test by phone" with a link to the Numbers & calls tab, and disable the card.
- "Your number" is validated as `+` and 8 to 15 digits, and remembered per browser (`localStorage`, in
  try/catch).
- "Call me" calls server fn `startTestCall({ flowKey, from, to })` → `voxio.calls.place` with an
  `idempotencyKey` (so a double click never rings twice). Then poll `testCallStatus(callId)` →
  `voxio.calls.get` every 2 s, showing Ringing → In call → Ended, with a "Hang up" that calls
  `voxio.calls.cancel`. Stop polling when ended, or after 10 minutes.
- When it ends, fetch `voxio.sessions.get(sessionId)` for the transcript and show it in the same Live
  panel format.

**Live panel**

- State → orb from `thinking-orbs` (`<ThinkingOrb state=… />`): connecting→`connecting`,
  listening→`listening`, thinking→`working`, speaking→`composing`. Don't use the "thinking" or
  "planning" orb styles; the owner doesn't like them.
- Mic level: wrap the orb or the panel in `voice-glow`'s `VoiceBeam` with `level={() => level.user}`,
  `processing={state === 'thinking'}`.
- Transcript: user on the right, agent on the left; partial (`final: false`) text in muted colour and
  replaced as it finalises; auto-scroll unless the user scrolled up. Wrap the agent's live bubble in
  `AiGlow`.
- Timer, Mute (shows muted state), End.
- Errors → friendly text (put the map in one helper):

  | code | Message |
  |---|---|
  | `mic-denied` | "Allow the microphone in your browser to talk to it." |
  | `no-device` | "No microphone found." |
  | `insecure-context` | "Testing needs https (or localhost)." |
  | `unsupported` | "This browser can't make voice calls. Try Chrome, Edge or Safari." |
  | `auth` / `rejected` | "The voice server didn't accept this flow. Check that it's connected." |
  | `network` / `connection-lost` | "The connection dropped. Try again." |

**After a test**

- Summary line: duration (`SessionSummary.seconds`), number of turns, and "View in sessions", which
  links to the flow's sessions with that `sessionId` highlighted.
- Save the test as a session in our database so it shows in the dashboard even before the backend
  writes sessions to Postgres: a server fn `saveTestSession(...)` using `mutate` to append to
  `flow.sessions` with `type: 'web'` (or `'phone'`), `status`, times, and the transcript collected
  client-side (`[{ role: 'user' | 'assistant', content }]`, the shape the rest of the dashboard reads).
  Mark it with `extra: { test: true }` so the Sessions table can show a small "Test" chip. Skip saving
  if the backend already returned the session through `voxio.sessions.get`.

### 3.3 Advanced (collapsed by default)

"Try different settings for this test" → a few `customs` overrides, in plain words, that apply to this
test only and are never saved to the flow:

- Voice: pick one of the account's saved voices (`account.voices`) → the TTS/STT customs keys.
- "Background noise sensitivity" slider → `vad-threshold` (0.3–0.9, default 0.5).
- Avatar model (only when the avatar is on): "Standard" `wav2lip` / "Detailed" `musetalk` →
  `lipsync-model`. Only offer the one matching the face's detector (s3fd→wav2lip, dwpose→musetalk).

---

## 4. Files

| File | Change |
|---|---|
| `web/package.json`, `vite.config.ts` | Link `@voxio/client`, `@voxio/react`, `@voxio/server`; SSR settings if needed |
| `src/server/dashboard/test.server.ts` | **new**: token/flow-key issuing, call place/status/cancel, session fetch; the only place `@voxio/server` is imported |
| `src/server/dashboard/api.ts` | Server fns `startTest`, `startTestCall`, `testCallStatus`, `cancelTestCall`, `saveTestSession` (ownership + `source === 'live'` checks) |
| `src/routes/dashboard.flows.$flowId.test.tsx` | **new**: the Test page (loader: flow + account voices) |
| `src/components/dashboard/test/*` | **new**: `BrowserTest.tsx` (lazy-loaded, the only importer of `@voxio/client`/`@voxio/react`), `PhoneTest.tsx`, `LivePanel.tsx`, `errors.ts` |
| `src/routes/dashboard.tsx` | Add the Test tab to `FLOW_SECTIONS` |
| `src/components/workflow/WorkflowEditor.tsx`, flow overview, flows list | Test entry points |
| `src/components/dashboard/SessionsTable.tsx` | "Test" chip for `extra.test` |
| `src/styles/dashboard-pages.css` | Test page styles (use `--db-*` variables so light and dark both work) |
| `web/changes.md` | Log entry |

Leave the existing `placeCall` server function and the Numbers page's call form alone for now; they'll
move onto the SDK in a later pass.

---

## 5. How to check it works

1. `pnpm test` in the SDK passes; `npx tsc --noEmit -p .` and `npx vite build` in `web` pass.
2. `npm run dev`, log in as an account with a live flow. On `localhost` (the mic needs https or localhost):
   - Browser test: talk, see state changes, transcript in both directions, mute, end. The session
     appears in the flow's sessions with the Test chip.
   - Same with the avatar on (a flow with faces): the video shows and the lips move.
   - A flow whose workflow emits web actions: they appear in the "What it would do" list, and nothing
     happens to the dashboard page.
   - Deny the mic: the friendly message shows, nothing is stuck.
   - Start a test and navigate away mid-call: the mic light turns off (session destroyed).
3. A dashboard-only (`mock`) flow: the Test page explains it isn't on the voice servers; nothing is sent.
4. Phone (once `VOXIO_API_URL`/`VOXIO_SECRET_KEY` and the backend `/v1/calls` exist): "Call me" rings
   the phone once even on a double click, status updates, Hang up works, the transcript shows afterwards.
5. Check the page in light and dark mode, and at phone width.

---

## 6. Known gaps (don't work around them in the dashboard)

- **Tokens and calls API** (`/v1/tokens`, `/v1/calls`, `/v1/sessions`) aren't on the backend yet. Until
  then browser tests use the owner's flow key, and phone tests stay "coming soon". **Decision for the
  owner:** if phone testing is needed before the backend `/v1/calls` ships, add a *legacy callbot adapter*
  to `@voxio/server` (it would call `callbot`'s `/plivo/outbound` with `user_api_key` + `flow_api_key`),
  so the dashboard still only talks to the SDK.
- **Live transcript/state events** depend on the backend sending them over the data channel (SDK plan
  B3). If only audio arrives, the page must still work: states from audio levels, and the transcript
  filled after the call from `sessions.get`.
- **Dashboard-created flows** can't be tested until vx-backend reads flows from Postgres.
- Testing an **unsaved** workflow needs a backend route that accepts an inline workflow; out of scope,
  so the test always saves first.
