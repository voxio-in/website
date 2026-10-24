# Handover

For the next Claude working on the Voxio dashboard (`D:\vx\website\web`). Read this first, then the files in "Read before you touch anything".

## What this is

Voxio sells voice agents. The customer console lives at `/dashboard` in this repo, a TanStack Start app (React, TanStack Router, server functions) with Prisma against Neon Postgres. Customers build **flows** (an agent's workflow, voice, listening and connections), test them, connect a phone number or website, then read their sessions.

## The goal

Turn the dashboard into a fast, production-grade console that every kind of Voxio customer understands at a glance. In practice that means two things:

1. **Speed and correctness of data.** Pages load from Neon via Prisma, one query per thing shown, with the same tenancy checks the backend enforces. No page should take more than a moment.
2. **Every screen designed from who uses it.** Not copied from other SaaS. Each page answers: what does this person come here to do, and what is the next step they need? The rules from `D:\ci\internal-shortlisting` decide how it looks.

## Why the mindsets

The user's way of working: before designing a page, work out who will use it and what is in their head when they arrive, then design for that. Copying a generic table or settings page gives screens full of numbers nobody asked for and buttons that lead nowhere.

`mindsets/voxio-users.md` holds the researched roles (small business owner, older or non-technical owner, agency or reseller, developer, ops or support person, admin) and what each wants. It also has a per-page definition, such as "Flows list". For any new or redesigned page:

- read the mindsets first;
- write down what each role wants on that page;
- build what they share, and push role-specific things one level deeper (menus, toggles, columns that are off by default);
- add the page's definition to `mindsets/voxio-users.md`.

Example: the Flows table shows a status per flow (Live, Quiet, Tested, Not tried) and a **next-step button** for that state (Try it, Connect, Last session, Test). A "Needs you" strip sits above the table, and admins get a "My flows | Everyone's" switch. All of it came from the mindsets, not from a template.

## Read before you touch anything

In this order:

1. `learn.md`: the design lessons and mindset, copied from ci.
2. `rules/ui.md`, `rules/material.md`, `rules/animations.md`, `rules/code.md`, `rules/db.md` (and `rules/jokes.md` for tone). Follow these strictly.
3. `D:\ci\internal-shortlisting\CLAUDE.md`, mainly its **type scale: 36 / 18 / 16**. Labels are 18px; small grey 12–14px text is wrong.
4. `mindsets/voxio-users.md`: who the users are, and the page definitions.
5. `changes.md`: what has been done, session by session. The latest entries are at the top.
6. `docs/AI_ASSISTANT_AND_VAD_PLAN.md`: future work (AI assistant, reseller "VAD" custom dashboards). Read it, but don't build it unless asked.
7. `docs/DASHBOARD.md`, `docs/DESIGN.md`: older context.
8. For data work: `D:\vx\vx-backend-monorepo` database service, `routers/services.py` (`require_owner`), whose checks we mirror.

## Hard rules (from the user)

- **Data goes Prisma to Neon only.** Never fetch dashboard data from the Voxio backend. The backend is used only for **voice**: chat, calls and testing.
- **Always mirror the backend's tenancy checks.** A user is the owner or has `users.role = admin`, otherwise no access. Also mirrored:
  - `start_node` validation (an empty workflow is allowed as a draft);
  - protected keys;
  - faces `version` = first 16 hex characters of the sha256 of the sorted uuids;
  - key format `vk_` + 64 alphanumeric characters.
- **Never start the dev server.** Verify with `npx tsc --noEmit` and `npx vite build`.
- **Log every session in `changes.md`**, in the same format as ci's changes.md.
- **Never print secrets.** Compare keys by hash.
- Server-only code goes in `*.server.ts`.
- Commit only when asked.

## Design patterns already in use (reuse them)

- **Connected groups:** inputs and buttons joined with 2px gaps and only the outer corners rounded. Used for the auth fields (`AuthGroup`), button groups (`db-btngroup`), the template grid (`db-tplgroup`) and the dialog footer (`db-dialog-split`, e.g. Import 25% / Cancel 25% / Create 50%).
- **No disabled button without a reason.** Let the person click, then say what's missing (field errors, Notices).
- **The next step sits where the eye lands.** One primary action per state.
- **Line tabs** at the top for switching modes (the Import dialog: Upload | Paste JSON). The box keeps a fixed size so nothing jumps.
- **Dialogs render through a portal** into `.db` (`components/dashboard/ui.tsx`), which fixes the backdrop line.
- **One audio player:** `components/dashboard/kit/AudioPlayer.tsx` (waveform seek, time, volume, `compact`).
- Plain-language names everywhere: "How your agent sounds", "Takes a message", not provider jargon.
- Styles mostly live in `src/styles/dashboard-m3.css`. Use tokens, not hard-coded colours.

## Where the code is

| Area | File |
|---|---|
| Data access, tenancy, per-flow load/mutate | `src/server/dashboard/store.server.ts` (`loadFlow`, `mutateFlow`, `flowOps`, `createFlowRow`, `isAdmin`, `primeRole`) |
| Server functions the pages call | `src/server/dashboard/api.ts` (return `JSON.stringify(Result)`; the client reads it with `unwire()`) |
| Flow session records, face uploads | `src/server/dashboard/flows.server.ts` |
| Login and session | `src/server/auth.ts`, `src/server/session.server.ts`, `src/routes/login.tsx`, `signup.tsx` |
| Flows list and New flow dialog | `src/routes/dashboard.flows.index.tsx`, `src/lib/workflow/templates.ts` |
| Import dialogs | `src/components/workflow/Transfer.tsx` |
| Voice tab | `src/routes/dashboard.flows.$flowId.voice.tsx`, `src/components/dashboard/ProviderEditor.tsx`, `src/lib/dashboard/providers.ts` |
| Voice samples | `scripts/voice-samples.py` (run from the backend's uv env) → R2 `samples/voices/<service>/<voice>.wav`; list in `src/lib/dashboard/voice-samples.json`; served by `src/routes/api.voice-sample.ts` |

## State right now (2026-10-25)

Done (see `changes.md` for details):

- login and signup rebuilt;
- Prisma-only data with tenancy checks;
- Flows table redesign;
- New flow and Import dialogs;
- Voice tab rebuild with Deepgram samples and the inline player.

Nothing is committed: everything is in the working tree on `main`.

Deferred. Ask the user before starting any of these:

- **Sarvam samples:** Sarvam credits are used up. The user said "leave Sarvam for now". Also, `bulbul:v2` is deprecated but still offered.
- **ElevenLabs samples:** none, on purpose. Users paste a voice ID they've already heard.
- Voice-card grid and a live microphone listening test.
- Slowness that code can't fix:
  - Neon autosuspend cold starts;
  - hosting far from Neon (ap-southeast-1); recommend hosting in Singapore.
- Account pages still use the whole-account `load()`; they could move to per-page queries.
- Reseller (client-level) access.
- Session status data is unreliable (many sessions have no status, phone sessions show 0 s), so don't build failure alerts on it yet.

## How to work with this user

- They review screen by screen and give short, typo-heavy messages. Read the intent; check screenshots carefully.
- When they name a pattern ("combination input", "like the HR upload screen"), go and look at the reference in `D:\ci\internal-shortlisting` before building.
- They want thinking first ("what would each type want"), then "build all". Give a concrete recommendation, not a list of options.
- Small, precise edits that match the surrounding code. Then report what changed and whether the build passed.
