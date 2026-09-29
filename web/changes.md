# Changes

A running log of work on this repo, newest first. One section per session, written for a
teammate who wasn't there.

Template:

```
## YYYY-MM-DD — Short title

**What changed**
Plain-language description of the work.

**Why**
The problem or reason behind it.

**State now**
What works, what's still open or half-finished.
```

---

## 2026-09-29 — Lab Equipment Support agent, on /calling and in the browser demos

**What changed**
- New agent "Rachel, analyser service desk" (first named Asha). It works in Hindi and English, like the NSDC desk.
- It covers lab testing machines that are not working and questions about increasing capacity.
- It walks the caller through safe first checks: power, the restart order, and QC after a lot
  change.
- Error codes, prices, upgrades, engineer visits and AMC go to a ticket. It never gives a price,
  a number or a date.
- Smoke, a burning smell or a leak makes it tell the caller to switch the machine off, then hand
  over to a person.
- On /calling it is the "Lab Equipment Support" desk. On /avatar it is a demo of the same name.
- The general helpline rules NSDC was built on are now their own file,
  `prompts/calling/support-engine.md`. NSDC and Lab both load their own product layer on top.

**Why**
Requested: an agent for a lab's testing machine that is broken or needs more capacity, speaking
Hindi and English like NSDC.

**State now**
- NSDC's generated call setup is byte-identical before and after the split, checked with
  `dump-customs.mjs nsdc` and `cmp`.
- The company is Roche Diagnostics by default.
- The greeting is in English. From the caller's first reply the support engine's language rules
  choose Hindi, English or Hinglish.
- The voice is ElevenLabs `eleven_v3` with voice `OtEfb2LVzIE45wdYe54M`. `ELEVENLABS_VOICE_ID_LAB`
  overrides the voice. The other desks keep Sarvam `simran`.
- The backend's ElevenLabs client uses the HTTP `text_to_speech.stream` call, which accepts v3.
  v3 is the slowest ElevenLabs model to start speaking, so replies may start later than on the
  Sarvam desks.
- `dump-customs.mjs lab` gives the English greeting with Roche, Soniox `hi`/`en`, and
  `tts_id: {service: elevenlabs, voice: OtEfb2LVzIE45wdYe54M, model: eleven_v3}`.
- `buildRoomCustoms('lab')` gives the same graph with the room webhook.
- `tsc --noEmit` was exit 0 when the desk was added. After the SDK removal it fails in
  `dashboard/test/*` and `server/dashboard/*`, which this change does not touch.
- No live call or browser session has been run.
- The /calling desk only appears when `VOXIO_FLOW_API_KEY_LAB` is set, or when the shared
  `VOXIO_FLOW_API_KEY` fallback is set. It is added to `.env.example`.

---

## 2026-09-29 — Voxio SDK unplugged so the site deploys

**What changed**
- `@voxio/client`, `/react`, `/server` and `/widget` are removed from `package.json`. They were
  `file:../../voice-bot-sdk/...` links, which don't exist on the server, so the voxio.in build failed.
- `tsconfig.json` "paths" now points all four names at `src/lib/voxio-sdk-off.ts`, a stand-in
  that throws "Testing is turned off" when used. No other imports changed.

**State now**
The whole site builds without the SDK. On the dashboard Test tab, browser, chat and phone tests
fail with that message; every other page works. To restore the SDK, drop the four "paths"
entries and add the packages back once they're published.

## 2026-09-29 — Demo login removed

**What changed**
- The "Explore the demo" button on /login and the `enterDemo` server function are gone.
- The demo account's database row became an ordinary user, so its 2 flows, 3 numbers and the
  rest stayed where they were. It is now name "Sample", username `sample`, email
  `sample@voxio.in`, with a new password. Its old logged-in sessions were ended.
- The account is no longer seeded on first load. `DEMO_EMAIL` and the reserved-email check on
  sign-up were removed.
- The sample-data helpers (`demoStore`, `mockSessions`, …) are still in `store.server.ts` but
  nothing calls them. `demoStore` is exported only so the typecheck passes.

**State now**
Log in as `sample` to see the old demo data.

## 2026-09-28 — Credits removed from the sidebar

**What changed**
- The hard-coded "Credits 1,250" row is gone from the dashboard's left rail (`dashboard.tsx`),
  along with its `.db-credits` styles.

**Why**
There is no billing yet, so the number meant nothing.

**State now**
No credits anywhere in the dashboard. Add the row back once there's a real balance to show.

## 2026-09-27 — Voice tests: typing box removed

**What changed**
- The "Type instead of speaking" box is gone from the browser voice test.
  - The SDK sent `{ type: "user_text", text }` over the data channel, but the voice server's
    `handle_datachannel_message` only handles `web_action_ack` and silently drops everything else.
  - The box cleared as if it worked and nothing happened.
- The chat test keeps its own input, which works.
- Put `onSend` back on the voice `LivePanel` once the backend handles `user_text`.

**State now**
- `tsc` and `vite build` pass.

---

## 2026-09-27 — Fix: tests of imported flows failed on a missing `webhook-url`

**What changed**
- With the saved setup now arriving (`received 4 key(s)`), the voice server got through STT and
  TTS, then failed in `AgentConfig`: "missing the required root 'webhook-url' key".
  - `agent_id` in customs replaces the whole agent, and we sent only `workflow`.
- Tests now send `agent_id: { workflow, 'webhook-url': <the flow's URL, or ''> }`. The engine only
  checks the key is present; empty means no webhook is sent. No setup check was added for it.

**State now**
- `tsc` and `vite build` pass. The next test should get past `AgentConfig`.

---

## 2026-09-27 — Imported flows test what's saved; faster saves; orb while saving

**What changed**
- **Tests of imported flows send the saved setup as customs.**
  - The voice server reads its own Mongo copy, which dashboard saves don't reach. Its log showed
    `Applying customs overrides — received 0 key(s)`, then the missing-STT crash.
  - For imported flows, every voice and phone test now sends the saved `stt_id`, `tts_id`, the
    workflow as `agent_id.workflow` (without the editor's `ui` positions) and every behaviour knob
    the flow has.
  - "Try different settings" is layered on top while open.
  - Chat can't carry customs (the SDK's chat sends only the session and key), so it still runs
    the voice servers' copy; the page says so.
- **Saves:** `mutate()` now keeps the account it just wrote in the cache instead of discarding it,
  so the reload after a save no longer reads the whole account from Neon again (about 0.7–0.9 s
  each for a 45-flow account). A save is now one full read plus the write, down from about three
  reads plus the write.
- **Orb:** "Saving…" shows the thinking orb in the save bar, the workflow editor and Settings.

**State now**
- `tsc` and `vite build` pass.
- Not tested against the voice server; the next test should log the keys arriving.

---

## 2026-09-27 — Fix: couldn't save a first listening or speaking setup

**What changed**
- `ProviderEditor` showed the first provider (Deepgram, or Sarvam for speaking) as already chosen
  when the flow had none.
  - Clicking that tile did nothing, because it looked selected, so the draft never changed and
    Save stayed disabled.
  - This hit every flow with no STT or TTS, which is where the Test tab's "Set up listening" and
    "Choose a voice" buttons lead.
- An empty setup now shows no tile selected, a "Not set up yet — pick a provider" note, and no
  fields. Any tile click chooses that provider and enables Save.

**State now**
- `tsc` and `vite build` pass.
- Checked in the browser on an imported flow with no STT or TTS: both sections show the note and
  Save is disabled; picking a provider selects it and enables Save; Discard restores.
- The save itself wasn't run, to leave that account's flow unchanged.

---

## 2026-09-27 — Code view: responses timed from their own request; test uses the full dialog

**What changed**
- **Timing:** each logged response carries a `ref` to the request that produced it (`WireLog`
  now returns the entry id).
  - A received row is timed from that request, not from whatever was sent last, which was off
    whenever entries interleaved.
  - Events that answer no request (state, transcript, messages) still use the last sent entry.
  - The response JSON shows `firstByteMs`; the row time covers the whole body, so a streamed chat
    reply counts to its last token.
  - The tooltip names the request it's measured from.
- **Width:** in the big dialog the test column no longer stops at 760px. It fills the dialog, or
  an even half beside the code panel, and the conversation stretches to the bottom.

**State now**
- `tsc` and `vite build` pass. Not re-checked in the browser.

---

## 2026-09-27 — Code view: no mass unfold, time only on received rows

**What changed**
- Opening the code view mid-test no longer unfolds every earlier entry. What was logged before
  the panel opened counts as seen; only entries arriving while it's open peek for 5 seconds.
- Sent rows show no time. A received row shows how long after the last request it arrived
  (`+240ms`), measured against the full log, so it still works under the Received filter. The
  tooltip keeps the time since the test started.

**State now**
- `tsc` and `vite build` pass. Not re-checked in the browser.

---

## 2026-09-27 — Test dialog grows on start; clearer code view

**What changed**
- **Dialog size:** the test dialog opens small (620px) with its button centred, then grows
  (animated) to the large size once the test starts or the code view is opened, and stays large
  after.
  - Height animates through `interpolate-size`; browsers without it snap.
- **Code view discoverability:**
  - A hint line says "Click any row to see its JSON."
  - Each new entry opens for 5 seconds (animated), then folds; clicking a row keeps it open.
  - Rows have a caret. Each batch has its own timer, so later entries don't cancel earlier folds.
- **Code view times:** each row shows the gap since the entry before (`+120ms`, `+1.4s`), not a
  running total. The total since the test started is in the tooltip.
- Animations are off under `prefers-reduced-motion`.

**State now**
- `tsc` and `vite build` pass. The dialog opening, the code toggle and the hint were confirmed in
  the browser.
- The size animation wasn't seen: the browser window was minimised during the check.

---

## 2026-09-27 — Test tab: three tiles, test dialog, code view

**What changed**
- **Tiles:** the Test tab is three centred tiles (Talk in the browser, Chat with it, Call my
  phone), each with one button.
  - A tile that can't be used says why under its button: not on the voice servers, build the
    workflow first, coming soon, or attach a number first.
- **Dialog:** the button opens a large dialog (`Dialog` gained `big` and `actions`) where the test
  runs.
  - Browser: the avatar and camera options.
  - Browser and phone: "Try different settings", plus the missing-setup list with its fix buttons
    when listening or speaking isn't set.
  - All three: the live panel and the result.
  - Closing the dialog ends the test; a live phone call is hung up.
- **Show code:** a toggle in the dialog header adds a "Sent and received" panel (`WirePanel.tsx`,
  `wire.ts`).
  - It logs every HTTP request and response the SDK makes, through a logging `fetch` passed to
    `@voxio/client` and `ChatbotLogic`.
  - It also logs every session event (state, final transcripts, web actions and acks, raw
    messages, errors, ended) and the phone test's place, status and hang-up calls.
  - API keys and tokens are masked; SDP and long strings are shortened. Entries expand to JSON
    and can be filtered (All / Sent / Received), copied or cleared.
- **No beam:** the agent's live bubble no longer has the border beam.

**State now**
- `tsc` and `vite build` pass.
- Checked in the browser on an imported flow: the tiles render centred, the browser dialog opens
  at 1,320px, and Show code opens the log panel.
- No call or chat was started, so the log hasn't been seen with real traffic.

---

## 2026-09-27 — Test tab: setup check, chat test, API key only

**What changed**
- **Setup check:** a flow with no listening (STT), no speaking (TTS) or an empty workflow shows
  "Finish setting it up first", with a button for each gap (Voice tab or Workflow). Voice tests
  (browser and phone) are blocked until it's done.
  - Before this, the voice server crashed building the call (`NotImplementedError: ... 'None'`,
    HTTP 500), and the page said "The connection dropped".
  - A voice picked under "Try different settings" fills the gap for that test.
  - Any remaining 500 now reads "The voice server couldn't start this flow. Check that its voice
    and workflow are set up".
- **Chat test:** a new "Chat with it" card (`test/ChatTest.tsx`) uses the SDK's chat
  (`ChatbotLogic` from `@voxio/widget`, now linked from the local SDK), authenticated with the
  flow's API key.
  - It needs only a workflow.
  - Replies stream into the same live panel. Ending the chat deletes the server session and
    records a `chat` session.
  - The chat server comes from `VX_CHAT` (default `chat.voxio.in`).
  - Chat is its own channel in the Sessions table, the Overview bar and Home.
- **API key only:** browser and chat tests always authenticate with the flow's own API key. The
  token path (`startTest`, `mintToken`) is gone; phone tests still go through `@voxio/server`.
- **Custom settings:** "Try different settings" customs are sent only while that section is open.

**State now**
- `tsc` and `vite build` pass. The SDK code loads only in the lazy test chunks.
- Looked at in the browser on imported flows: a complete flow shows all three cards; `temp1` (no
  STT or TTS) lists both gaps, disables Start talking and keeps chat.
- No voice or chat conversation was actually started.

---

## 2026-09-27 — Log in with email or username

**What changed**
- The login field is now "Email or username". Input with an `@` is looked up by email; anything
  else by username.
- Username matching is exact first. It ignores case only when exactly one account matches,
  because the old backend has `admin` (a reseller) and `Admin` (an admin) as two users.

**Why**
Accounts imported from Mongo logged in by username, and some only have placeholder emails, so
they couldn't log in.

**State now**
- `tsc` and `vite build` pass. Username lookups were checked against the data.

---

## 2026-09-27 — Imported sessions and flows work in the dashboard

**What changed**
- **Session types:** `channelOf()` in `lib/dashboard/client.ts` maps any stored session type to
  phone, browser or avatar. The backend's `voice` (and `web`) count as browser.
  - Used in the Sessions table, the Overview channel bar and Home's recent sessions.
  - A web call with a recording but no web-action steps (every imported one) now plays its
    recording in the replay dialog.
- **Test tab:** an account's own flow imported from Mongo (its Neon id is the Mongo `_id`) counts
  as on the voice servers, so it can be tested.
  - `onVoiceServers()` in `api.ts` replaces the live-only check in every test server function.
  - The page notes that tests run the voice servers' copy, since dashboard edits don't reach it
    yet.
- **Duplicates:** a live env key that is also one of the account's own flows is now listed once on
  Flows and Home.

**State now**
- `tsc` and `vite build` pass.
- Checked in the data: the owner's account has 6 flows, 5 of them imported. Sessions: voice 780,
  phone 634, browser 45, avatar 27.
- Not clicked through in the browser as the owner (their password isn't known here).

---

## 2026-09-27 — Old MongoDB copied into Neon

**What changed**
- `scripts/migrate-mongo.mjs` copies the backend's MongoDB (`voxioagents_db`) into the matching
  Neon tables.
  - Dry run by default; writes only with `--apply`. Mongo is only read.
  - Each Neon row takes its Mongo `_id` as its id, and inserts skip rows already present, so
    re-running adds only new records.
- Applied: 23 users, 662 agents, 570 stt, 571 tts, 660 flows, 1,282 sessions, 27 faces, 2 numbers.
- Decisions:
  - The owner's Mongo account was merged into their Neon account; the Neon login and key stay.
  - 12 users had no API key and got new ones.
  - 4 users got `@import.voxio.local` placeholder emails.
  - Unowned flows, voice configs and faces went to the admin with the most flows.
  - One session with no flow was skipped.
- Passwords: 7 were plain text in Mongo and were scrypt-hashed. 17 were bcrypt and kept as they
  are. Login now checks bcrypt (`bcryptjs`) and upgrades the hash to scrypt on the next
  successful login.

**Why**
So every account and flow from the old system exists in the dashboard's database.

**State now**
- This is a one-time copy. The voice backend still reads and writes Mongo, so new data there
  won't appear in Neon until the script is re-run.
- Edits made in the dashboard to imported flows don't reach the voice servers.
- Imported flows show as dashboard flows, so the Test tab still says they aren't on the voice
  servers.
- Mongo stores browser sessions as type `voice`; the dashboard only knows `browser`, `phone` and
  `avatar`.
- Two faces already existed in Neon under the demo account with the same uuids, so they stay
  there.
- Migration `20260926120000_voxio_mongo_tables` is in the database but not recorded; run
  `npx prisma migrate resolve --applied 20260926120000_voxio_mongo_tables`.

---

## 2026-09-27 — Test tab for flows, built on the Voxio SDK

**What changed**
- New **Test** tab on every flow, right after Overview (`dashboard.flows.$flowId.test.tsx`).
  There are also Test buttons on the Overview, on each row of the Flows list, and in the workflow
  editor. The editor button says "Save and test" when there are unsaved changes and saves first.
- **Browser test:** runs through `@voxio/react`'s `useVoxioSession`, in a lazily loaded chunk
  (`components/dashboard/test/BrowserTest.tsx`, the only importer of the browser SDK).
  - Options: "Show the avatar" (when the flow has faces) and "Let it see my camera" (when vision
    is on).
  - The live panel shows the orb, the mic glow, the transcript both ways, typing instead of
    speaking, Mute and End.
  - Web actions are listed under "What it would do on your website" and acked, never run on the
    dashboard.
  - The call ends on unmount and on `pagehide`.
- **Phone test** (`PhoneTest.tsx`): "Call me" from one of the flow's numbers.
  - One idempotency key per attempt, so a double click never rings twice.
  - Polls every 2 s (Ringing → In call → Ended), with Hang up. The transcript shows afterwards.
- **Advanced:** another saved voice (`tts_id` / `stt_id`), background noise sensitivity
  (`vad-threshold`) and the avatar model (`lipsync-model`, matched to the face's detector) for one
  test only. These are sent as customs and never saved to the flow.
- **After a test:** duration, number of turns, "View in sessions" (`?session=` highlights it on the
  Overview), and Copy transcript. The Sessions table shows a small "Test" chip.
- **Server:** `server/dashboard/test.server.ts` is the only place `@voxio/server` is used. `api.ts`
  gains `getTestSetup`, `startTest`, `startTestCall`, `testCallStatus`, `cancelTestCall` and
  `saveTestSession`, each with ownership and live-flow checks.
- **SDK link:** `@voxio/client`, `@voxio/react` and `@voxio/server` are linked from the local
  checkout with `file:../../voice-bot-sdk/packages/*`. `vite.config.ts` dedupes React, because the
  SDK checkout has its own copy.

**Why**
Owners had no way to try a flow before putting it in front of callers. Building this on the SDK is
also how the SDK gets tested. Plan: `docs/FLOW_TEST_PLAN.md`.

**State now**
- `tsc` and `vite build` pass.
- Checked in the browser with the demo account, in light and dark mode:
  - the tab, the list and editor buttons, and the Advanced section all render;
  - a dashboard-only flow shows "isn't on the voice servers yet" with everything disabled.
- **Not yet tried against a real voice server.** No live flow is visible locally:
  `DASHBOARD_LIVE_EMAILS` and `VX_DATABASE` aren't set in `.env`.
- **Mode today:** the browser test uses the owner's flow key, and phone testing says "coming
  soon". Setting `VOXIO_API_URL` and `VOXIO_SECRET_KEY` switches on tokens and phone tests once the
  backend has `/v1/tokens`, `/v1/calls` and `/v1/sessions`.
- **Live-flow test sessions aren't written to our database**, because overlays aren't persisted
  (see `docs/DASHBOARD.md`, known problem 1). The voice server records them itself, and the Test
  chip for those comes from a per-browser list.
- **SDK gaps:**
  - `calls.cancel` is documented for calls that haven't started yet, so Hang up mid-call may not
    work.
  - A token fetch that fails surfaces as a generic `network` error.
- After an SDK change, rebuild the SDK (`pnpm build`) before testing here.

---

## 2026-09-26 — Fix: production build failed on the auth module

**What changed**
- `npm run build` / `start.ps1` failed:
  `[import-protection] Import denied in client environment … @tanstack/react-start/server`.
  - `src/server/auth.ts` exported the plain function `currentUser()` next to its server
    functions.
  - The Settings page imports `auth.ts`, so `currentUser()` and its cookie import were kept in
    the client bundle. Server functions are split into RPCs; plain exports aren't.
- Everything server-only (scrypt, sessions, cookies, `currentUser`) moved to
  `src/server/session.server.ts`. `auth.ts` now contains only server functions and uses
  it inside their handlers. `server/dashboard/api.ts` imports `currentUser` from the new
  module.

**Why**
The user's build broke. Dev mode doesn't enforce import protection, so typecheck and dev testing
didn't catch it.

**State now**
- `vite build` succeeds, client and server.
- The auth smoke test over HTTP passes again: sign-up, weak and duplicate refused, who-am-I,
  dashboard 200, log out, wrong password refused, right password accepted.
- The test user was deleted; 0 users.
- Rule going forward: run the production build after adding server-side code.

---

## 2026-09-26 — Log in / sign up on Neon, dashboard behind a session, duplicate flow

**What changed**
- **Database:** the site already used **Neon** Postgres via Prisma (pooled `DATABASE_URL`, direct
  `DIRECT_URL`). Added two models in `prisma/schema.prisma`:
  - `User`: email unique, name, scrypt `passwordHash`.
  - `AuthSession`: SHA-256 of the cookie token, user, expiry, IP and user agent. Cascades on
    user delete.
  - Migration `20260926031058_dashboard_auth` was generated with `prisma migrate diff` against
    the live database. It's additive only (two CREATE TABLEs, indexes, one foreign key). It was
    applied with `prisma migrate deploy`, which never resets, and not `migrate dev`.
- **`src/server/auth.ts`:** `signUp`, `logIn`, `logOut`, `getMe`, `updateProfile`, and the
  server-side `currentUser()`.
  - scrypt (N=16384) with a per-user salt and a constant-time compare. A decoy hash keeps an
    unknown email as slow as a wrong password.
  - 30-day sessions in an httpOnly, SameSite=Lax cookie (Secure in production). Only the token
    hash is stored.
  - Error messages never say which emails exist.
  - Rules: at least 8 characters, with a letter and a number.
- **Protection:**
  - `/dashboard` redirects to `/login?next=…` without a session (`beforeLoad`).
  - **Every** dashboard server function in `server/dashboard/api.ts` now refuses without a
    session (14 guards, checked).
  - `next` only accepts same-site paths.
- **Pages:** `/login` and `/signup` (`components/auth/AuthPage.tsx`, `styles/auth.css`).
  - Split layout: brand panel with the VA mark and three points, plus the form. Show/hide on
    passwords, live password rules on sign-up.
  - Already signed in → straight to the dashboard. The site chrome is hidden on these pages.
- **Sidebar:** the signed-in person (initial, name, email) with a log-out button. **Settings**
  shows the real account: name editable (saved to Neon), email read-only, Log out.
- **Duplicate flow:** a copy icon in the Flows table and a Duplicate button on the flow page.
  - Copies the workflow, voice, behaviour, knowledge and avatar settings into "*Name* (copy)"
    with a new key.
  - Sessions, numbers and deliveries aren't copied.
  - Server fn: `duplicateFlow`.

**Why**
The user asked for login and sign-up connected to the database (and asked which database —
Neon), plus a way to duplicate a workflow.

**State now**
- Typecheck passes.
- Verified end to end over HTTP against Neon, the way the browser calls it. A seroval-encoded
  script ran sign-up (a weak password is refused), cookie set, who-am-I, `/dashboard` 200 with
  the cookie and 307 without, duplicate email refused, log out, wrong password refused, right
  password accepted.
- The test user was deleted afterwards; there are **0 users** in the database now.
- **Not yet per-account:** everyone who signs in sees the same flows and demo data (the
  dashboard store and the `VOXIO_*` keys in `.env` are single-account). Scoping data per user is
  the next step.
- No rate limiting on login yet.

---

## 2026-09-26 — Connecting and deleting lines made forgiving

**What changed**
- **Drop anywhere on a card.** React Flow's default (strict mode) only connected if the line
  was released exactly on the target's input dot, so most drops did nothing. Now:
  - `ConnectionMode.Loose`, so a drag can start from either dot.
  - `onConnect` turns the line round so it always leaves from an output (`next` or a branch path).
  - `onConnectEnd` finds the card under the pointer and connects to it when the drop missed
    a dot.
  - Duplicate lines are ignored.
- **The "+" moved to a pill under the card** ("Add next step"). Before, it sat right beside the
  output dot, so approaching the dot hit the + instead. The per-path +s on branches are gone;
  drag from a path's dot.
- **Deleting a line:** a custom edge (`components/workflow/Edge.tsx`) shows an **×** at the
  middle of a line on hover or when selected. The line has a 26px invisible hover area.
  Delete / Backspace still works on a selected line, and undo covers it.

**Why**
The user tried about ten times and couldn't connect: lines only took when dropped exactly on a
dot, and nearing the dots showed the +. There was also no visible way to delete a line.

**State now**
- Typecheck and the 5-workflow round-trip pass.
- Not verified by hand: I can't drive a browser in this session, and the Chrome extension isn't
  connected. Checking connect / delete properly needs a real browser.

---

## 2026-09-26 — Connector dots grabbable every time

**What changed**
- **Root cause:** `.wf-h:hover { transform: scale(1.35) }`. React Flow positions handles with its
  own `transform: translate(…)`, so hovering replaced it and the dot jumped off the edge, away
  from the cursor. Whether you caught it depended on where you landed. The forced `left` /
  `right` offsets also fought React Flow's placement.
- Handles now keep React Flow's positioning. Hover, and connecting from or to a dot, shows a
  coloured ring (box-shadow) instead of scaling. Branch-path dots sit on the card edge
  (`right: -16px` on the row).
- The "+" hover bridge is removed; it also overlapped the branch dots' grab areas. The +
  now starts just past each dot's grab area (card edge + 14px), so the two touch without
  overlapping.

**Why**
The user reported that some connector dots could be grabbed and others couldn't.

**State now**
CSS only. Browser-only behaviour, still unseen (the Chrome extension isn't connected).

---

## 2026-09-26 — Connections can be dragged again, and moved

**What changed**
- **Bug:** the invisible hover bridge added for the "+" button (`.wf-quick::before`, 48px wide)
  covered the card's output connector, so pressing on it hit the bridge and no line started.
  It's now 12px and only spans the gap between the connector and the "+".
- Every connector has a larger invisible grab area (9px around it) and sits above the "+"
  layer. Dropping a line near a step snaps to it (`connectionRadius` 36).
- **Existing lines can be moved:** drag either end of a line onto another step. Dropping it on
  empty space removes it. Undo covers both. Uses `onReconnect` / `reconnectEdge`; the line id
  stays in the `source|handle|target` form the converter expects.
- The line being drawn shows as a dashed teal line.

**Why**
The user couldn't drag a connector to make a line.

**State now**
Typecheck passes. Dragging is browser-only and still unseen (the Chrome extension isn't
connected).

---

## 2026-09-26 — Listen setup, full-width fields, tidier connections, grid, faster zoom

**What changed**
- **Listen has a setup:** "Save what they say as", showing *What the caller said*
  (`user_input`) as a named item, with chips to add another name. Its card says what it saves.
- **Full-width fields** in the step panel. Instructions, the large Instructions view, dropdowns,
  steppers and tags all span the panel; the Instructions box was falling back to its default
  width.
- **Connections overlap less.**
  - Curved (bezier) lines instead of right-angle tracks that stacked on top of each other.
  - Auto-layout uses the real card sizes: 264px wide, taller for branches (one row per path).
  - More spacing between columns and rows, with a multigraph so parallel paths are spaced.
  - Existing flows keep their saved positions — press **Tidy up** once.
- **Grid toggle** in the toolbar: shows a line grid and snaps cards to it (24px).
- **Faster zoom.**
  - The wheel zooms around the pointer with a larger step than React Flow's default; pinch
    (Ctrl+wheel) is faster still.
  - Only visible cards are rendered.
  - The backdrop blur and gradient behind the sidebars, top bar and page are switched off on the
    workflow page, since they were repainted on every zoom frame.

**Why**
User feedback: Listen is a real step (what we ask the caller for); Instructions only used half
the width; lines overlapped; wanted a grid; zoom felt slow.

**State now**
Typecheck and the 5-workflow round-trip pass, and the page renders. Zoom feel, line routing
and the grid are browser-only and still unseen (the Chrome extension isn't connected).

---

## 2026-09-26 — Workflow steps audited against the engine; every option in plain words

**What changed**
- **Audit.** Each step's settings were checked against the parameters its engine node actually
  reads (`agent/.../nodes/**`):
  - *AI reply* (streaming) doesn't read emotion, so emotion is gone from it.
  - *AI decision* doesn't read interruption settings, so they're gone from it.
  - *Look up knowledge* ignores the result count, so that setting is gone.
  - Internal-only settings (prompt template, tag stripping, regex flags, raw settings objects)
    are no longer shown. They still round-trip.
  - Gaps logged in DASHBOARD_BACKEND_PLAN §15.
- **"If the caller interrupts" has all six engine behaviours**
  (`services/general/interruption_manager/im_.py`): Stop and listen, Always finish, Only at the
  start, Only after a few seconds, Only on short replies, Only on long replies.
  - Picking a time or word option reveals its one setting (seconds, or words of the agent's
    reply).
  - Every option has "Words that don't count as interrupting" (`ignore-words`).
  - The old "Finish the first moment" label described `duration` backwards; it's fixed.
- **No code-like text in settings.**
  - *What it decides* shows Spoken reply / End the call / Website actions as named items with a
    note, and adds them with one tap.
  - *Also send* on Say has an "End the call" switch.
  - *Branch → Decide on* is a dropdown of what earlier steps produce, in words.
  - *Pass along* is tap-to-pick chips.
  - *Emotion style* is a dropdown (ElevenLabs v3).
  - *AI provider* is on the main Setup tab.
  - No JSON editors remain in the panel.
- **Branch cards read naturally** ("If end the call is yes") and show **→ where each path goes**
  on hover. Card summaries use knowledge-base names and plain value names.
- **The + menu stays open** until you click elsewhere or press Esc. An invisible bridge keeps
  the hover while moving from the card to the +.

**Why**
User feedback: the + menu vanished on the way to it; settings still showed JSON and code
words; only one interruption choice; emotion style should be selectable; paths should say
where they go; the provider should be visible; check every step shows correct, complete
options.

**State now**
- Typecheck and the 5-workflow round-trip pass.
- Canvas behaviour is client-side and still unseen in a browser (the Chrome extension isn't
  connected).

---

## 2026-09-26 — Workflow editor: plain-language steps, minimal cards, add-next-step

**What changed**
- **Steps have plain names and icons.** In `lib/workflow/registry.ts`: Say, Listen, Filler, AI reply
  (streaming), AI decision (waits), Guide on website (marked *Coming soon*), Branch and
  Look up knowledge.
  - The Shopify steps are hidden from the picker, like Apps, but still render.
  - Each type has an accent colour and a `summary()` that writes one sentence for its card:
    `“Hi! How can I help…”`, `Llama 3.3 70B · You are a friendly…`, `Checks “hangup”`,
    `Searches Clinic FAQ`.
  - Step ids show as words ("ask_for_input" → "Ask for input"). Renaming in the panel turns
    words back into a safe id.
- **Cards are minimal** (`NodeCard.tsx` + `workflow.css`): a small tinted icon tile, name, kind,
  one line of summary, and chips only when something is notable (Can't be interrupted,
  Needs attention, Coming soon). The first step carries a "Starts here" flag.
  - A Branch lists "If *hangup* is *true*" / "Otherwise", each with its own connector.
  - Hovering a card shows a **+** that adds the next step, placed and connected.
- **Toolbar:** name + "All changes saved / Unsaved changes", icon buttons (undo, redo, tidy up,
  fit), Templates, a health pill (All good / N tips / N to fix), a code-view icon, and Save.
  The minimap is gone.
- **Step picker:** "Add a step", grouped Talk & listen / AI / Decide / Knowledge, with a tile, name
  and one line each.
- **Settings panel:**
  - Icon header with the name editable in place, and Setup / More tabs.
  - Plain labels, each with an (i): Instructions, Model (option notes on what each model is good
    for), What it decides, If the caller interrupts, Paths, and so on. The Say step is a single
    "What to say" box.
  - All controls are the dashboard ones (styled dropdowns, toggles, steppers, tags).
  - No JSON tab; Copy JSON plus duplicate / delete icons in the footer.
  - Look up knowledge picks from the account's real knowledge bases: the route now loads the
    account and passes them in.

**Why**
The user found the editor technical and unintuitive, and the nodes "weird and techy". They
asked for minimal, clear, clean steps with nice chips and cards.

**State now**
- Typecheck passes.
- The workflow round-trip test still passes on all 5 workflows, so saving writes exactly what
  the engine expects.
- The page renders from the dev server, but the canvas itself draws only in the browser and
  hasn't been seen — the Chrome extension still reports no connected browser.

---

## 2026-09-25 — New shell (sidebar, breadcrumbs, credits), fewer tabs, Avatars/Knowledge/Webhook/Numbers redone

**What changed**
- **Shell, modelled on internal-shortlisting:**
  - **Main sidebar:** the Voxio **VA** mark (as on the favicon) with the name, then icon +
    label items, then Settings and a sample **Credits 1,250** row at the bottom.
  - Collapses to icons, with the label shown on hover. The choice is remembered.
  - **Top bar:** a collapse button left of a back arrow and a **breadcrumb**
    (Dashboard › Flows › *Flow name* › *Section*).
  - **Inside a flow** the main sidebar collapses to icons automatically, and the flow's
    section menu sits beside it. The collapse button then toggles the flow menu.
  - Styles in `src/styles/dashboard-shell.css`.
- **Menu trimmed:**
  - Apps is commented out (the account rail and the flow menu; the page files still exist).
  - Deleted: Web actions (web actions belong to the LLM node in the workflow), Customs,
    Sessions, Analytics, and the Monitor group.
  - "Where people talk to it" is now a 4th KPI card on the flow overview: a split bar plus a
    Phone / Web / Video legend.
- **Numbers & calls:**
  - You can't add new numbers any more — you ask the Voxio team. The account has a list of
    provisioned numbers (sample), shown on the flow with a detach icon.
  - An "Attach a number" dropdown moves one of your numbers onto this flow, taking it off any
    other flow. Server functions: `getNumbers`, `setFlowNumber`.
  - Place a call keeps From, Now/Schedule and Time; Customs and the carrier name are gone.
- **Webhook:** only the endpoint URL (with validation), the signing secret as a chip
  (reveal / copy / new secret icons), and event toggles, each with an (i). The deliveries log
  is gone, since nothing stores deliveries.
- **Developers:** the account key uses the same icon chip as the flow key. It's now a shared
  `components/dashboard/KeyChip.tsx`.
- **Avatars page:**
  - A large glowing drop zone. After you pick a file: a portrait preview, a name, and a
    "Face tracking" dropdown whose options have (i) notes.
  - Beside it, four "For the best result" tips, starting with **stay silent — keep your mouth
    closed, we make the lips move**.
  - Faces show as a gallery of looping previews, with copy/delete on hover.
- **Flow Avatar tab:** a three-step strip (choose a face → add looks → that's it). Sections
  renamed to Looks / Smooth changes / Lip-sync, each with a plain (i) instead of a paragraph.
- **Knowledge page:** each knowledge base is a card listing its sources (type icon, name,
  Ready pill, remove), with an empty state. "Add content" opens a dialog with **Files**
  (multi-file drop zone), **Website** (URL + "whole site" toggle) or **Text** (title + text).
  New `kb.removeSource` op.
- **Flow Knowledge tab:** a toggle row per knowledge base, and a plain note about whether the
  workflow has a lookup step. No "chunks" or "collection" wording.
- `DropZone` added to `controls.tsx`. New `src/styles/dashboard-pages.css`.

**Why**
User feedback: follow internal-shortlisting's navigation (breadcrumbs, a collapse button,
credits, labelled sidebar, auto-collapse with two menus); use the VA mark; hide Apps; drop
tabs that belong elsewhere or aren't backed by data; numbers are provisioned, not added;
Avatars and Knowledge looked standard and adding content was confusing.

**State now**
- Typecheck passes and the changed pages render from the dev server; the removed tabs 404.
- Still not seen in a browser.
- The typecheck hit Windows' commit limit (166 MB free of 28 GB) and only passed after the dev
  server was stopped. The machine is short on virtual memory.
- Uploads (faces, knowledge files) are recorded in the mock store; no file leaves the browser
  yet.

---

## 2026-09-25 — Clearer nudge option, stepper unit next to its number

**What changed**
- The silence nudge's "While nudging" is now **"If the caller talks over it"**. Options:
  *Stop and listen* (`full`), *Finish the sentence* (`no`), *Finish the first moment, then
  listen* (`duration`). Stored values are unchanged.
- **Stepper:** the number box is sized to its digits, so the value and unit read together and
  centred ("250 ms"). Before, the box stretched and pushed the unit to the far edge.

**Why**
The user found "While nudging" unclear, and "ms" sat far from the 250.

**State now**
Typecheck passes; not yet seen in a browser.

---

## 2026-09-25 — Wider replay dialog, timed transcript, steppers, (i) on everything, Behaviour as rows

**What changed**
- **Replay dialog:** always wide (up to 1120px), so the 4 fact cards sit in one row. The
  transcript is always shown (no dropdown), with each message's time underneath, on video
  sessions too.
  - Transcript entries accept an `at` (or `offset`) in seconds.
  - Sample sessions got times spread across the call. All 204 were migrated on load.
- **Numbers are steppers:** `NumberUnit` is now − value + with the unit inside, clamped to its
  range. The value can still be typed.
- **(i) on every setting:** all 68 provider settings and all Behaviour/Voice/Avatar settings.
  - **Model options explain what each is good for** (e.g. Flash v2.5 "starts speaking fastest,
    best for live calls"; Nova 3 Medical "knows drug names…").
  - While a dropdown is open, hovering an option shows its note in a card beside the list (to
    the right, or the left if there's no room). Options that have a note show a small ⓘ.
- **Tooltips and dropdowns no longer get cut off.** Both render into the dashboard root with
  fixed positioning and follow scrolling, so no dialog or scrolling card can clip them.
- **Behaviour** is full-width rows instead of three columns. Setting labels are a touch larger.

**Why**
User feedback: the replay dialog was too narrow for its facts; the transcript shouldn't hide
behind a toggle and needs times; number inputs should be +/−; every setting and model option
needs an (i); the (i) popover was being clipped; Behaviour should be rows.

**State now**
- Typecheck passes.
- From the dev server, every flow tab renders with steppers, dropdowns and (i) buttons, and the
  transcript times are present in the data.
- The floating popovers, the side note card and the dialog layout only run in the browser, and
  still haven't been seen.
- Live sessions show message times only if the backend sends them. Worth adding an `at` per
  transcript entry to the session doc (DASHBOARD_BACKEND_PLAN §14).

---

## 2026-09-25 — Voice, Behaviour, Avatar and Vision rebuilt; every provider setting exposed

**What changed**
- **Research:** compared each voice provider's docs with what our clients actually read. Written
  up for the backend in `vx-backend-monorepo/docs/VOICE_PROVIDER_CONFIG.md`: per provider, every
  key, its range and default, and whether we **read** it or need to **add** it.
  - Deepgram (Nova + Flux), Soniox, Sarvam STT; Sarvam, ElevenLabs, Deepgram Aura, Google and
    Resemble TTS.
  - Bugs it found:
    - Soniox's `enable-speaker-diarization` / `speaker-lock` / `max-speakers` are set on
      skill-india but read by nothing.
    - Google TTS crashes without `language` / `gender`.
    - Resemble uses `use_hd` (underscore).
    - The dashboard's own Deepgram STT config wrote `model-name`, which the streaming client
      ignores. Fixed, and stored configs are migrated.
- **`lib/dashboard/providers.ts` rewritten** from that research. Every setting has a label,
  control type, range, default and one-line help. Model-dependent settings only show for that
  model (Flux turn settings, bulbul v2 pitch/loudness, Soniox v5 endpoint settings).
- **New controls** (`components/dashboard/controls.tsx`):
  - A styled `Dropdown` with keyboard navigation, option hints and search for long lists
    (37 Sarvam voices).
  - An `InfoTip` (i), a `Slider` showing its value, `NumberUnit`, a `Tags` input and `CopyJson`.
  - The native `<select>`s on Numbers & calls and Avatars were replaced too.
- **Voice tab:**
  - Two clearly marked sections: **Listening** (speech to text) and **Speaking** (text to speech).
  - Each has provider tiles, the main settings, a collapsible "More settings" and a
    **Copy config** button. There's no raw-config editing any more.
  - The audio settings moved here from Behaviour: noise suppression under Listening, voice
    texture under Speaking.
- **Voices page:** Speaking and Listening sections of voice cards (copy / edit / delete). New and
  edit open a dialog with the same provider editor.
- **Behaviour:** Conversation, Turn-taking and Silence cards made of setting rows. Label and (i) on
  the left, control on the right.
  - The early-reply window and the silence nudge are named fields (ms, times, message) —
    **no JSON anywhere**, just a Copy JSON button per card.
  - The conversation-engine dropdown has an (i) per option.
  - Dependent settings only appear when their switch is on.
- **Avatar and Vision are separate tabs.** Avatar holds expressions, transitions and lip-sync
  (no GPU/cost wording). Vision holds camera understanding.

**Why**
User feedback: voice sections weren't clearly defined, the dropdowns looked raw, editing raw
config didn't belong there, JSON was showing on Behaviour, the audio settings belonged with
Voice, Avatar and Vision are different things, and users shouldn't see how things work
internally (GPU cost).

**State now**
- Typecheck passes.
- From the dev server, all of Voice, Behaviour, Avatar, Vision and Voices render with the new
  controls, with no JSON text and no GPU wording.
- The dropdown, sliders and tooltips are client-side and still unseen in a browser.
- Settings marked **add** in the backend doc are saved but ignored until the backend reads
  them.
- `src/server/voice/roleplays/shared.ts` (the older demo-call code) also sends `model-name`
  to Deepgram, so that model choice is ignored too. It wasn't touched.

---

## 2026-09-25 — Replays in a dialog, workflow as an edit card, bigger key and rename

**What changed**
- **Workflow on the flow overview is no longer a diagram.** It's a single card (icon, step
  count, "Edit workflow") that opens the editor. `WorkflowPreview.tsx` was deleted.
- **API key** is a bigger, lit panel: teal tint and glow, larger key text, and 40px reveal /
  copy / rotate buttons. The **rename** pencil is 44px.
- **Replays open in a dialog** instead of expanding under the row (`SessionsTable.tsx`).
  - The top has small fact cards: minutes, channel, caller (or steps done for web sessions)
    and status.
  - **Phone:** a custom player with a big round play button and a waveform. The waveform is
    decoded from the recording with Web Audio, and you click it to seek. Shows elapsed /
    total time.
  - **Video:** agent and caller-camera videos side by side, in a wider dialog. The caller's
    follows the agent's play, pause and seek.
  - **Web:** a step list with a numbered or ticked marker per step (teal done, red failed,
    amber interrupted), the action and target, what the agent said, and the page's response
    time.
  - Transcript in a collapsible box.
  - `Dialog` gained `sub` and `wide`.

**Why**
The user didn't want the workflow drawn on the overview — only a way in to edit it. They
wanted the key and rename controls easier to see, and replays shown in a proper dialog rather
than inline.

**State now**
Typecheck passes and the overview renders. The dialog, the player and the waveform run only in
the browser, and haven't been seen yet — the Chrome extension still reports no connected browser.

---

## 2026-09-25 — Flow overview redone, session replays, minutes rounded up, no "Demo" labels

**What changed**
- **Minutes use one rule everywhere:** each session counts as whole minutes, rounded up
  (1 s → 1, 59 s → 1, 61 s → 2). It's `billedMinutes()` in `lib/dashboard/client.ts`, used
  by the KPIs, the charts, the flows list and the sessions table. The Flows table has its own
  Minutes column.
- **No "Demo" wording in the UI.**
  - `<Mock>` now renders nothing; the calls are left in place so it's one line to bring back.
  - Removed: the demo-flow banner, the Live/Demo pill, "Includes demo data", the
    Behaviour notice and the Settings "Mock data" card, plus the "held in the mock store"
    save notes.
  - An undialled call now says why, for example "Not dialled — VX_CALLBOT is not set".
- **Flow overview:** no "Overview" heading.
  - The flow name is the title, with a pencil to rename it in place. A "Created …" chip sits
    in the top right.
  - The API key is a compact chip under the name with icon buttons: reveal, copy, and rotate
    (rotate asks for confirmation in a small popover).
  - Then the KPIs (Sessions, Minutes, Avg. length) and a **workflow preview**: a read-only
    React Flow render, `components/workflow/WorkflowPreview.tsx`. The preview and an
    "Edit workflow" button both open the editor.
  - Then the Minutes/Sessions usage chart and a **paginated sessions table**.
  - "At a glance" is gone.
- **Sessions table with replay:** `components/dashboard/SessionsTable.tsx`, also used by the
  Sessions tab, which keeps its search and channel filter.
  - 10 per page; columns When, Channel, Caller, Minutes, Status and a replay button. Clicking
    the row opens the replay too.
  - **Phone:** plays the recording.
  - **Video (avatar):** the agent's video beside the caller's camera when there is one. The
    caller's video follows the agent's play, pause and seek.
  - **Web:** a step timeline — the time, the action and its target, what the agent was saying,
    and whether the page did it (done / failed / didn't respond / caller interrupted), plus
    the transcript.
- **Sample media for the sample sessions:**
  - Phone sessions use `/api/sample-recording?seed=…`, a generated speech-like WAV
    (`src/routes/api.sample-recording.ts`).
  - Avatar sessions use `/bg.mp4`, with `/assets/aurora.mp4` as the caller's camera.
  - Web sessions get an action list.
  - Existing stores are filled in on load (`enrichSession` in `store.ts`).
  - `Session` gained `avatarVideoUrl`, `clientVideoUrl` and `webActions`.

**Why**
User feedback: minutes looked wrong; "Demo" everywhere was noise; the key took too much room;
the overview should show the workflow and the sessions (with replays) rather than a summary
list.

**State now**
- Typecheck passes.
- From the dev server: the overview renders its name, key chip, created chip and workflow
  preview. The sessions table renders with pagination and replay buttons, and the sample WAV
  route serves audio. 132 phone, 27 video and 45 web sessions got replay media.
- Still not seen in a browser.
- The backend doesn't record avatar/camera video or web-action outcomes per session yet, so
  those replays have nothing to show for live flows until it does. It needs adding to
  DASHBOARD_BACKEND_PLAN.

---

## 2026-09-25 — Flows table fixes: session count colour, a key for every flow, New flow dialog

**What changed**
- **Sessions count rendered black.** `calling.css` and `webnav.css` both define a global
  `.num { background: #000; display: flex … }`. Once either page has been visited its
  stylesheet stays loaded, so it hit the table's `num` cells. The dashboard's class is now
  `db-num`, and table cells pin their own text colour.
- **Every flow has an API key.** The Sandbox used the literal key `sandbox` and showed "—".
  It now gets a real `flow_…` key. Existing `.data/dashboard.json` files are migrated on the
  first load, and all the sandbox special cases are removed. It's an ordinary demo flow now,
  so it can also be deleted.
- **New flow opens a dialog:** name field, then the 4 templates as a 2×2 grid, then
  Cancel / Create flow. Esc or a click outside closes it. It's a reusable `Dialog` in
  `components/dashboard/ui.tsx`, and `/dashboard/flows?new=1` opens it directly.

**Why**
Reported by the user: the session count showed in black, a flow shouldn't exist without an API
key, and New flow should be a dialog rather than a panel pushed into the table.

**State now**
- Typecheck passes.
- From the dev server: the table renders a key for every row, the Sandbox was re-keyed, and
  the dialog renders with its 4 templates.
- Still not seen in a browser.
- **Worth a sweep later:** other route stylesheets (`calling.css`, `webnav.css`, …) use
  unprefixed global class names, and they leak across client-side navigation.

---

## 2026-09-25 — Flows table restyled; whole rows are clickable across the dashboard

**What changed**
- **Flows table:**
  - Each name has a coloured initial tile: teal for live, amber for demo.
  - Under the name is a small Live/Demo pill and the minutes used.
  - The API key sits in an inset chip with its copy icon.
  - Header labels are small caps, and rows highlight with an accent edge on hover.
  - Edit and delete icons stay faint until the row is hovered or focused.
- **Whole-row clicks:** `rowLink()` in `components/dashboard/ui.tsx` makes a row behave like
  its main link. Clicks on buttons, links and inputs inside the row still do their own job,
  and Enter works from the keyboard.
  - Used on: flow rows (open the flow), Home's recent sessions (open that flow's sessions),
    voice rows (open the editor) and customs presets (load the preset).
  - Session and webhook-delivery rows were already full-width buttons.
  - Lists with nothing to open (numbers, stores, knowledge sources) stay plain.

**Why**
The user wanted the table in the new modern style and rows that respond to a click anywhere,
not only on the text.

**State now**
Typecheck passes and the pages render with the clickable rows in place. Still not seen in a
browser — the Chrome extension reports no connected browser.

---

## 2026-09-25 — Dashboard: second panel only inside a flow, one switchable chart, calmer look

**What changed**
- **Second panel:** it no longer lists flows. It now appears only inside a flow, where it
  holds that flow's sections. Home and Flows use the full width with just the icon rail.
  The panel reads the flow's name from the flow route's own loader, so the shell no longer
  fetches the flow list on every navigation.
- **Charts:** one usage chart (bklit area chart) with a **Minutes / Sessions** switch and a
  7d / 30d / 90d switch. It shows the period total as a headline number.
  - Used on Home and on a flow's Analytics tab. The separate minutes and sessions charts are
    gone.
  - The entry animation is shortened to 450 ms.
- **Speed:**
  - Dashboard loaders are cached for 30 s (`staleTime`). Before, every click re-fetched,
    including the live flows over the network.
  - The loading screen waits 800 ms before showing, so fast navigations never flash it.
- **Look:** a new `src/styles/dashboard-theme.css` layer.
  - Layered translucent surfaces with a soft glow, a faint gradient backdrop, 20px radius
    and more whitespace.
  - Pill-style switches, bigger KPI numbers, a gradient primary button, and a gradient
    brand mark in the rail.
  - Home greets you and reads as a summary, not a console.
  - The loud yellow "MOCK" badge is now a quiet "Demo" pill; hover still explains why.

**Why**
The user found the flow list in the second panel pointless, wanted one chart with a
minutes/sessions option, and said the dashboard felt sluggish and technical rather than
modern.

**State now**
- Typecheck passes and every page renders.
- **Still not seen in a browser.** The Chrome extension reports no connected browser from this
  machine, so the look, the chart switch and the speed need checking by eye.

---

## 2026-09-25 — Dashboard redesign: double sidebar, full width, bklit charts

**What changed**
- **Layout:** a slim icon rail plus a context panel (`src/routes/dashboard.tsx`).
  - On Home and Flows the panel lists your flows.
  - Inside a flow it lists that flow's sections, grouped Build / Connect / Monitor. This
    replaces the cramped horizontal tab strip.
  - Pages with nothing to list have no panel. On Workflow the panel folds away so the canvas
    has room; it can be toggled from the rail.
  - Pages now use the full width, and the base type is larger (15.5px body, 30px headings).
- **Home overview:** three short, wide KPI cards: Total flows, Total minutes used, Total
  sessions completed. Below them, a minutes-per-day area chart, a sessions-per-day bar chart
  and recent sessions.
- **Flows:** now a table with columns Name, API key (masked, with a copy icon), Sessions,
  Connections and actions.
  - Connections shows the first item as a chip; the rest appear on hovering "+n".
  - Edit workflow and Delete are icons. The Nodes column is gone.
  - Search and "New flow" are inside the table.
- **Flow overview and Analytics:** KPIs are Sessions, Minutes and Avg. length. "Completed"
  was removed.
- **Charts:** now from **bklit UI** only.
  - Its AreaChart and BarChart are vendored from its shadcn registry into
    `src/components/bklit/`, along with their registry dependencies.
  - The hand-made SVG bar chart was deleted.
  - bklit needs Tailwind, so Tailwind v4 was added (`@tailwindcss/vite`). It emits **utilities
    only, no preflight**, scanned from `components/bklit` only, and loaded only by
    `/dashboard` (`src/styles/bklit.css`), so the marketing site is untouched.
  - Chart colours are set as `--chart-*` variables in that file.
  - `vite.config.ts` now bundles `@visx/*` for SSR (`ssr.noExternal`). The 4.0 alpha
    packages use extensionless ESM imports that Node can't load; without this the Home page
    failed to render.

**Why**
The first version packed too much into a narrow column, with small type and a long tab strip.
It read like a technical console. The dashboard is used by developers but should feel like a
product for users: simple, spacious, big type. The user asked for bklit UI for all charts.

**State now**
- Typecheck passes.
- Every dashboard page renders from the dev server. The generated chart CSS was checked:
  only utilities, no reset.
- **Not yet seen in a browser** (the Chrome extension still isn't connected). The charts draw
  client-side after measuring their container, so their look — and the hover "+n" popover —
  still needs an eye.
- `createServerFn().inputValidator()` now logs a deprecation warning. It's used across the
  project (including `calling.ts`), so it was left for a separate sweep.

---

## 2026-09-25 — Customer dashboard at `/dashboard`, with a visual workflow builder

**What changed**
A new dashboard at `/dashboard`. There's no sign-in yet; the server acts as the one account in
`VOXIO_USER_API_KEY`. The marketing site's backdrop and navbar are switched off under
`/dashboard` (`SiteChrome` in `src/routes/__root.tsx`).

- **Sidebar:** Overview, Flows, Voices, Avatars, Knowledge, Integrations, Developers,
  Settings. There are deliberately no "Build / Deploy / Observe" groups. Anything a flow owns
  (its API key, webhook, customs, numbers, sessions, charts) lives *inside* the flow.
- **Flow page:** 13 tabs.
  - Overview: key with reveal, copy and rotate; name; an at-a-glance summary.
  - Workflow; Voice; Behaviour; Avatar & vision; Knowledge; Web actions; Integrations.
  - Customs: builds per-call overrides and saves presets.
  - Webhook: URL, signing secret, events, delivery log with redeliver.
  - Numbers & calls: bring-your-own numbers; call now or schedule.
  - Sessions: search, filter, transcript view.
  - Analytics: stat tiles plus per-day charts with a table view.
- **Workflow builder:** `src/components/workflow/`, built on `@xyflow/react`, laid out with
  `@dagrejs/dagre`.
  - A palette of every node type the agent engine accepts, taken from one registry:
    `src/lib/workflow/registry.ts`.
  - A canvas where you drag to connect. Fan-out is supported, and each Branch node gets one
    exit per route.
  - A settings panel per node with Settings / Advanced / JSON tabs and a proper input for
    each field.
  - Live validation, undo/redo, Ctrl+S, auto-layout, templates, and a raw JSON mode.
  - `src/lib/workflow/convert.ts` converts between the engine's JSON
    (`{nodes:{name:{type,parameters,next}}}`) and the canvas. Node positions are stored in
    `workflow.ui`, which the engine ignores. Unknown node types and parameters are kept
    verbatim.
- **Data layer:** `src/server/dashboard/api.ts`.
  - A flow is either **live** (a key in `.env` as `VOXIO_FLOW_API_KEY*`, read from the
    database service at `VX_DATABASE`) or **mock** (kept in `.data/dashboard.json`, which is
    git-ignored).
  - When saving a live flow, fields `PUT /flow` accepts go to the backend. Everything else
    goes to that flow's mock overlay and is shown with a **Mock** badge.
  - Account-level data (shared voices, knowledge bases, avatars, Shopify stores, the account
    key) is all mock for now.
- **Things that really call out:**
  - Webhook "Send test" and "Redeliver" make real HTTP requests from this server.
  - "Call now" and "Schedule" go through callbot when the flow is live and `VX_CALLBOT`,
    `VOXIO_USER_API_KEY` and a from-number are set. Otherwise they record a mock session.
- **New files:**
  - `scripts/workflow-roundtrip.mjs` checks every real workflow JSON survives the converter
    unchanged. Run it with `node --experimental-strip-types scripts/workflow-roundtrip.mjs`.
  - `SERVERS.database` (env `VX_DATABASE`) added to `src/server/voice/servers.ts`.

**Why**
Customers need to manage flows, API keys, numbers, webhooks and usage themselves. The
workflow graph was the hardest part: until now workflows were hand-written JSON.

The backend can't support much of this yet. It has no list endpoints, no key rotation, no
usage aggregation, no webhook log, and `PUT /flow` ignores runtime settings. So the user
asked for mocks wherever it's incompatible, so the UI can be built and judged now.

What the backend needs is written up for the backend work in
`vx-backend-monorepo/docs/DASHBOARD_BACKEND_PLAN.md`, sections 1–13.

**State now**
- `npm run typecheck` passes.
- The round-trip test passes on all 5 real workflows, including one with a Branch node.
- Every dashboard page and every flow tab renders from the dev server (checked by requesting
  each route).
- **Not yet checked in a browser:** dragging and connecting on the canvas, the save buttons,
  and the charts' hover. The Chrome extension wasn't connected this session.
- **Live flows need `VX_DATABASE` in `.env`.** Without it they're listed with an error, and
  only the mock flows ("Sandbox" and "Clinic front desk (demo)") work.
- Known backend blockers, all of which show as *Mock* in the UI:
  - Behaviour settings can't be saved (`PUT /flow` drops them, §13).
  - Live keys can't be rotated (§3).
  - Voice presets can't be shared by reference (§2).
  - The web-navigation node isn't registered in the agent engine (§12).
- Delete `.data/dashboard.json` to reset the demo data.
- The SDK snippets on Developers describe a planned `@voxio/sdk` that doesn't exist yet. The
  REST and webhook examples are the real ones.

## 2026-09-26 — Dashboard on Mongo-shaped Postgres tables
- `prisma/schema.prisma`: dashboard tables replaced by copies of the backend's Mongo collections (users, agents, flows, stt, tts, sessions, numbers, faces) + knowledge_bases, knowledge_sources, webhook_deliveries. Same names via @@map/@map so vx-backend can move off Mongo with little change. Applied with `prisma db push`.
- `src/server/dashboard/store.server.ts`: reads/writes these tables (Prisma only, one transaction per save). Demo account seeds itself on first open. Flow runtime knobs (integrations, web-actions, etc.) live in `flows.runtime`.
- `src/server/auth.ts`: signup/login on `users`; each account gets its own API key.
- Verified: tsc, vite build, and a live Neon test (demo seed, create/edit/delete flow, account rename, key rotation carries numbers + calls).

## 2026-09-26 — Dashboard speed, theme, beam/orb
- Speed: account load is one joined query (Prisma `relationJoins`) + 20s in-memory cache cleared on every save; sign-in check cached 60s. Load 3.0s → 1.0s cold, ~5ms warm.
- Light/dark toggle in the rail above Settings (remembered per browser). Dashboard colours moved to CSS variables so both themes share one stylesheet.
- Log out is its own rail item (icon when collapsed).
- Flow menu folds to an icon strip with hover labels instead of disappearing.
- `border-beam` around AI inputs (workflow prompts, vision instructions, knowledge text, selected AI step); `thinking-orbs` for page loading. `liquid-gooey` and `voice-glow` installed, not used yet.
