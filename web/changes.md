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

## 2026-10-27 — Data button in tests and replays; saved OpenRouter list with Refresh

**What changed**
- The live test panel and the session replay have a **Show data / Hide data** button whenever the conversation has extra data. It starts from the flow's **Show extra data** setting and only lasts while that test or replay is open; the flow setting (Behaviour, saved as soon as it's flipped) is unchanged.
- The OpenRouter model list is now saved to `.data/openrouter-models.json` and served from there, with no expiry. The model picker has a footer ("468 OpenRouter models · updated 2 hours ago") and a **Refresh** button, which fetches the list live from OpenRouter, saves it again and updates every open picker. If a refresh fails, the saved list stays and the footer says why. `Dropdown` gained an optional `footer`.

**Why**
People want to show or hide data for one demo without changing the flow, and want the model list stable but refreshable on demand.

**State now**
The model list lives in a file on the server (`.data/` is gitignored), not in Neon: it's a cache of public data, not account data. On a fresh server the first picker that opens fetches it.

**Files**
src/components/dashboard/test/LivePanel.tsx, src/components/dashboard/SessionsTable.tsx, src/server/dashboard/openrouter.ts, src/lib/workflow/useModels.ts, src/components/workflow/Fields.tsx, src/components/dashboard/controls.tsx, src/styles/dashboard-controls.css

## 2026-10-27 — "Show extra data" switch per flow

**What changed**
Behaviour has a new card, "What the conversation shows", with a **Show extra data** switch. Off hides the "Agent · data" bubbles (frame, score, feedback, anything a step sends besides its words) in the live test panel (browser, chat and phone tests) and in session replays on the flow's Overview. It takes effect the moment it's flipped (saved straight away, not through the Save bar) and is stored on the flow (runtime `show-data`, read through `showsData()` in `lib/dashboard/client.ts`), so it holds for every future test and replay and for everyone who opens the flow. On by default.

**Why**
People demoing a flow want only the conversation on screen, without the raw JSON.

**State now**
Only the display changes: the data is still received and saved, so switching it back on shows it again. The developer views (the test's code panel and the replay's Raw log) still show everything, since they are opened on purpose. The public site's VoiceRoom doesn't show raw data and is unchanged.

**Files**
src/routes/dashboard.flows.$flowId.behaviour.tsx, src/lib/dashboard/client.ts, src/components/dashboard/test/LivePanel.tsx, BrowserTest.tsx, ChatTest.tsx, PhoneTest.tsx, src/components/dashboard/SessionsTable.tsx, src/routes/dashboard.flows.$flowId.test.tsx, src/routes/dashboard.flows.$flowId.index.tsx

## 2026-10-27 — Every OpenRouter model in the workflow model picker

**What changed**
The AI model picker in workflow steps now lists OpenRouter's whole live catalogue (468 models today), fetched from `https://openrouter.ai/api/v1/models`. The three curated OpenRouter picks stay at the top with their notes; the rest follow alphabetically, each with its input price as the hint and, beside the open list, a one-line description, in/out price per million tokens and context size. The picker is searchable, so type to find a model.

**Why**
Only three OpenRouter models were offered, out of hundreds.

**State now**
The list is fetched by a server function and cached in memory for an hour; if OpenRouter can't be reached the picker shows the curated models only. The canvas card names a live-only model by its id (e.g. `openai/gpt-6.1-terra`), since its friendly name isn't in the registry. Docs still list the curated models only. Whether every model works with "AI thinks" (structured fields) depends on the model.

**Files**
src/server/dashboard/openrouter.ts (new), src/lib/workflow/useModels.ts (new), src/components/workflow/Fields.tsx

## 2026-10-26 — Docs reorganised: lifecycle order, no-code path, missing pages

**What changed**
The docs sidebar now follows the order people actually work in: Get started → Build your agent → Test and go live → Add to your site → Monitor → Developers → Help (`GROUP_ORDER` in `pages.tsx`; `PAGES` is sorted by it, so Previous/Next walk the sidebar). New pages, in `src/lib/docs/guide-pages.tsx`: Quickstart: phone agent (no code), Concepts and dashboard map (glossary, flow status, every dashboard page and flow tab mapped to its doc), Vision, Testing, Phone numbers and calls, Sessions and history, Troubleshooting, FAQ. The Introduction now opens with "Choose your path" and the Build → Test → Go live → Monitor stages. Moves and renames: keys, environments, errors and the Server SDK pages sit under Developers; webhooks under Monitor; headless sessions ("Your own call interface") and web actions under Add to your site, so "Build your agent" and "Build your own" no longer sit side by side; Quickstart is "Quickstart: website", Steps is "Workflow steps", Phone calls is "Phone calls API". The two avatar pages link to each other. Every top-level page has a sidebar icon, and sidebar search matches the whole page text, not just titles and headings.

**Why**
The docs assumed a developer who already knew the product: no dashboard-only path, no phone quickstart, no testing/numbers/sessions pages, and related pages split across confusingly named groups.

**State now**
Typecheck and build pass. Not covered yet because the dashboard hides them: Knowledge and Integrations (both commented out of the dashboard nav). Still missing: a per-endpoint REST reference, a changelog, and screenshots.

**Files**
src/lib/docs/guide-pages.tsx (new), src/lib/docs/pages.tsx, src/lib/docs/agent-pages.tsx, src/routes/docs.tsx

## 2026-10-25 — Flow overview: Test is always in the header

**What changed**
Test is back in the overview's header group, filled as it was before the redesign, before Duplicate and Export (testers come to this page to test). The next-step card only offers Test (or Try it) when that is the next step, so a Tested flow (next step: Connect) or a Quiet one (next step: Last session) had no way to test from the overview.

**Files**
src/routes/dashboard.flows.$flowId.index.tsx

## 2026-10-25 — Back to port 3000

**What changed**
The default port is 3000 again in the npm scripts, `start.sh`, `start.ps1` and the README, to match nginx (`setup.sh` proxies voxio.in to 127.0.0.1:3000). Production still listens on 127.0.0.1 only.

**Files**
package.json, start.sh, start.ps1, README.md

## 2026-10-25 — The site runs on port 3001 by default

**What changed**
The default port is 3001 everywhere it was 3000: the npm scripts (`dev`, `start`, `serve`), `start.sh`, `start.ps1` and the README. Nothing else in the code names the port.

**State now**
`pm2 restart website` reruns the process's saved command, so it picks this up if that command is one of the npm scripts or start scripts. If the pm2 process was started with its own port, or nginx proxies to :3000, those need changing on the server.

- **Production listens on 127.0.0.1** (`npm start`, `npm run serve`, the start scripts' `--prod`). `vite preview` on "localhost" can bind to IPv6 only, and nginx proxies to `127.0.0.1`.
- **On the server, nginx still proxies voxio.in to :3000** (`setup.sh`), which gives a 502 now that the site is on :3001. Its config must point at 3001.

**Files**
package.json, start.sh, start.ps1, README.md

## 2026-10-25 — Workflow canvas: connect on any side, and a magnet that lines steps up

**What changed**
- **A connection point in the middle of every side.**
  - Say, Listen, AI and Filler steps have one on top, right, bottom and left, and each works both ways.
  - A Branch is entered on top, left or bottom; its paths still leave on the right.
  - Dropping a line anywhere on a card connects at the middle of the side nearest the pointer.
  - The dots stay faint until the card is hovered.
  - Lines between other sides route themselves with rounded right angles. The hand-movable bends stay for the usual right → left line.
- **Saved with the workflow:** which side each line leaves and enters is kept in the canvas layout (`ui.sides`), only when it isn't the usual right → left. The engine never reads it; a step's sides all mean its "next".
- **The magnet:** a step being dragged snaps when its middle comes within 16px of a connected step's middle, across or down, so the line between them runs straight. With the grid on, the grid does the snapping instead.
- **"Add next step"** under a card moved to its bottom right, clear of the bottom connection point.

- **Fixed the same day:** the magnet pushed steps out of line. React Flow keeps its own unsnapped position for a dragged step and sends it once more on release ("drag finished"). The magnet only snapped the in-progress reports, so the step jumped back on release. The release is now snapped too.
  - When a step lands in line with a connected step, any hand-moved bend on the line between them is dropped, since an old bend keeps its jog even between level steps.
- **The editor remembers Script or Flow** in this browser (`vx.wf.view`) and opens on the one last used. An empty workflow still opens on Flow.

**Why**
Lines had a small jog whenever two steps were a few pixels out of line, and everything had to leave on the right and enter on the left, so a loop back or a step below took a long way round.

**State now**
Typechecks and builds. `scripts/workflow-roundtrip.mjs` passes on the 3 real workflows (jl, nsdc, skill-india-vidya), and a line saved bottom → top loads back bottom → top. Not tried in a browser.

**Files**
src/lib/workflow/convert.ts, src/components/workflow/WorkflowEditor.tsx, src/components/workflow/NodeCard.tsx, src/components/workflow/Edge.tsx, src/components/workflow/ScriptView.tsx, src/styles/workflow.css

## 2026-10-25 — Workflow editor: every step's settings, by what decides the step

**What changed**
- **The panel:**
  - Tabs are **Main settings** and **Developer settings** (were Setup and More).
  - Each setting's help line is in view under it, not only behind an (i).
  - Settings that don't apply right now aren't shown.
  - Copy JSON moved into a ⋯ menu in the footer; Delete says "Undo (Ctrl+Z) brings it back" (tooltip and a toast).
  - Every step opens on Main settings.
  - Inputs, dropdowns, chips, tags and tabs inside the panel are 16px; the step name is 20px.
- **Say:**
  - **"These words | What the AI decided"** first. "What the AI decided" speaks the reply of the AI step before it, with **Hang up when the AI says so**. Before, that was chips under More, and the main tab looked empty.
  - A Say added on its own now defaults to **Always finish** (not "Stop and listen"), as every template and move does for fixed lines.
  - **Remove speaker labels** shows only when **Tidy values before sending** is on.
- **Listen:** "Save what they say as" moved to Developer settings. The main tab says it waits for the caller, with nothing to set, and that silence is handled on Behaviour.
- **One moment… (Filler):** the phrases' help says it only helps when it runs beside a slow step, from the same Listen.
- **AI thinks (silent):** **It decides**, with switches "What to say next" and "Whether the call is over", on Main settings. Other fields stay in Developer settings as "Everything it decides", and the main tab says how many there are.
- **AI answers (out loud):** **Can end the call** on Main settings.
- **Both AI steps:**
  - **Shares memory with** is a dropdown of the memories the workflow uses ("The main conversation", others) plus "Its own memory". It was free text, where a typo silently split the memory.
  - **Add emotion** only shows its switch with an ElevenLabs voice; otherwise it says "Works only with an ElevenLabs voice. This flow speaks with Deepgram."
  - **Give up after** shows only when another AI step starts from the same step.
  - An empty **Instructions** box offers examples: Friendly assistant, Takes a message, Short survey.
- **Branch:**
  - **Decide on** lists yes/no answers first and leaves out lists and groups (conversation history), which can't be branched on.
  - Choosing a yes/no sets Yes and No paths at once; they can't be renamed or removed.
  - Text paths say they match the exact word, and to tell the AI the words in its instructions.
  - **Otherwise** is listed with where it goes.
  - Removing a connected path says its line went too, and that Undo brings it back.

**State now**
Typechecks and builds. Not looked at in a browser. What's saved is unchanged except the new Say default (Always finish) and the paths a yes/no Branch gets when chosen.

**Files**
src/lib/workflow/registry.ts, src/components/workflow/Fields.tsx, src/components/workflow/SettingsPanel.tsx, src/components/workflow/WorkflowEditor.tsx, src/routes/dashboard.flows.$flowId.workflow.tsx, src/lib/docs/agent-pages.tsx, src/styles/workflow.css, mindsets/voxio-users.md

## 2026-10-25 — Workflow editor: add steps by conversation move

**What changed**
- **Add to the conversation** (the step list on the left) leads with **conversation moves**. Each adds its steps already named and connected, built the way the templates are:
  - **Greeting:** Say "Hi! Thanks for calling…" → Listen (plus the step that shows the caller's words);
  - **Ask a question:** Say → Listen;
  - **AI conversation:** AI answers → its reply → back to the Listen before it (a Listen is added first if there is none);
  - **AI decides when to end:** AI thinks → speaks its reply → Branch "is it over?" → yes: Goodbye and hang up, no: back to Listen;
  - **Goodbye and hang up:** Say with hang-up on;
  - **One moment…:** Filler.
  Single steps sit under "Single steps", folded. Clicking a move adds it after the open step; dragging drops it where you let go.
- **"Add next step" suggests what usually comes next**, under "Usually next": after Say, Listen (or Goodbye); after Listen, AI conversation or AI decides when to end; after an AI that answers, **Back to Listen** (a line, no new step); on a branch path, Goodbye or Back to Listen. Then all moves, then single steps. Steps that can't run on calls aren't offered.
- **Every branch path has its own "Add next step".** Before, only steps with one way out had it.
- **Say:** "Hang up after saying this" is on its main settings (it was under More → Also send). The card shows a **Hangs up** chip and no "Add next step" after it.
- **AI steps named for what you hear:** "AI answers (out loud)" (was AI reply) and "AI thinks (silent)" (was AI decision). Adding an AI that thinks also adds the Say that speaks its reply, connected. The docs and the Assistant's prompt use the new names.
- **Step ids** start from a short base ("say", "listen", "ai_answers", "branch"), and moves name their steps ("greeting", "question", "answer", "goodbye", "is_it_over?").
- **Empty canvas:** "Start your agent" with **Start with a greeting** (a greeting, then an AI conversation) and Start from a template.
- **Branch paths** named true/false read **Yes** and **No** in the settings panel and can't be renamed into something the AI never says.
- **Filler:** "How often it speaks" is a percentage slider (was a 0–1 number).
- **Cards:** the copy icon on every card is gone (Duplicate stays in the panel and on Ctrl+D).
- **Script view:** a Say that speaks the AI's reply reads "Speaks the AI's reply, and hangs up when the AI says it's over", not "Sends Spoken reply without speaking"; a goodbye reads "Says, then hangs up".

**State now**
Typechecks and builds. Not looked at in a browser, and no move has been run on a real call.
- Moves only add steps; they never change or remove existing ones. Undo takes a whole move back in one step.
- Existing flows open unchanged: the ids and the saved format are the same.

**Files**
src/lib/workflow/recipes.ts (new), src/components/workflow/WorkflowEditor.tsx, src/components/workflow/NodeCard.tsx, src/components/workflow/Fields.tsx, src/components/workflow/ScriptView.tsx, src/lib/workflow/registry.ts, src/lib/docs/agent-pages.tsx, src/server/assistant/loop.server.ts, src/styles/workflow.css, mindsets/voxio-users.md

## 2026-10-25 — Workflow editor: Script view first, plain checks, a quieter bar

**What changed**
- **Script, the new default view.** Every place the agent's words live, in the order a conversation goes (following the arrows from the first step):
  - "Says": each Say step's line, in a big box;
  - "Told": each AI step's instructions, in a big box that also opens full screen;
  - "Fills the silence with": filler phrases;
  - quiet lines for the rest: "Waits for the caller to speak", "Decides on end the call: if yes → Goodbye · otherwise → Listen", "Then back to Listen" where it loops;
  - steps nothing leads to are listed last, under "Not connected yet";
  - each item has **Show in Flow**, which opens that step on the canvas.
  It edits the same steps as the canvas, so Undo, the checks and Save work the same. An empty workflow opens on Flow.
- **Script | Flow** tabs in the bar. The bar keeps Undo, Redo, the checks, Test and Save. Tidy up, line style, grid, templates, import, export and View as code moved into a ⋯ menu, each in words. (Tidy and Fit used the sliders and eye icons; Fit stays in the canvas's corner controls.)
- **Templates ask first:** "Start from a template…" opens a dialog that says it replaces the current steps and that Undo brings them back.
- **No template that can't be saved:** "Answers from your documents" uses Look up knowledge, which is hidden for now, and failed the checks. It's left out of the New flow dialog and the editor (`OFFERED_TEMPLATES`) until knowledge comes back.
- **Checks in plain words, with what to do**, using the editor's own names. For example, "This AI step has no instructions yet. Tell it who it is and what to do." (was "Empty system prompt."), and "Nothing leads here, so it never runs. Connect a step to it, or delete it." (was "Never reached from the start node."). The loop check names Listen (it said "Wait for caller").
- **Add next step** no longer offers steps that can't run on calls.
- **Type:** card names 18px; kind, summary, branch paths and chips 16px (were 12.5–16.5px). Palette names 18px, descriptions 16px. Panel labels 18px, help 16px. Cards are 300px wide and the side panel 440px. Auto-layout and "add next step" spacing grew to match.
- **First view of the canvas** fits the first six steps (by position) at up to 100%, not all of them tiny.

**Why**
Most people open the editor to change words (Margaret's prompt, the opening line, the feedback), not the shape of the graph. Before, that meant finding the right box among 14, opening a 380px side panel, and reading 13px text. See "Workflow editor" in `mindsets/voxio-users.md`.

**State now**
Typechecks and builds. Not looked at in a browser.
- Not built yet (Part 2): Test over the editor, a wider panel with tabs named for what's inside, and links from a session line to the step that spoke.
- Step names are still the ids (`say_2`); cards don't ask for a name when added.
- `components/ui/floating-panel.tsx` is no longer used by anything.

**Files**
src/components/workflow/WorkflowEditor.tsx, src/components/workflow/ScriptView.tsx (new), src/components/workflow/NodeCard.tsx, src/lib/workflow/validate.ts, src/lib/workflow/registry.ts, src/lib/workflow/templates.ts, src/lib/workflow/layout.ts, src/routes/dashboard.flows.index.tsx, src/styles/workflow.css, mindsets/voxio-users.md

## 2026-10-25 — Behaviour: by what the caller notices, and only true settings

**What changed**
- **Three sections named after what you hear:** How fast it answers; When you talk over it; When the caller goes quiet. Each has one line saying what it's for. Before: Conversation, Turn-taking, Silence.
- **One choice for pace:** Waits for you · Answers quickly · Starts before you finish, with one sentence on what you'll hear. Each sets the engine, warm-up, first words and reply early together. The exact settings are under **Fine-tune**, which opens by itself when they were set by hand.
- **The nudge is in seconds** ("After 8 s", 2 to 120). The voice server compares `time-period` with `time.time()`, which is seconds (`tasks/inactivity_monitor/task_.py:65`), but the page asked for milliseconds. So the default "1000 ms" made it wait 1000 seconds (about 17 minutes), and the nudge never fired.
  - New flows now start at 8 seconds.
  - A flow saved with an old millisecond value shows "That's 17 minutes. It was likely meant as 1 second." under the field.
  - The docs say seconds (`"time-period": 8`).
- **Removed "Caller's pause before replying".** The voice server never reads `speaker-turn-timeout-ms`, so changing it did nothing. The docs' tuning tips that relied on it now point at the engine, warm-up, first words and reply early.
- **Settings that need the faster engine say so.** Reply early, its window, and Hold the floor are built only into the speech-native engine. With the other engine they show "Works only when it listens to how you speak" instead of a control.
- **Honest engine choice:** "How it knows you've finished": Waits for your words (the voice server's default) or Listens to how you speak (Faster). Before, the second was marked Recommended while every new flow used the first.
- **Plain names:** "Ignore background noise" (was Voice detection sensitivity), with "Web calls only; phone calls filter noise on their own". The chip reads "Web calls".
- **Header:** Try it in Test, and a ⋯ menu with Copy settings as JSON. It's the Voice tab's menu, now shared (`kit/CopySettingsMenu.tsx`).
- **Type:** labels and the pace sentence 18px; help, chips and notes 16px (were 12–17px).

- **After the owner's look (same day):**
  - The controls inside each setting (numbers, units, slider values, dropdowns) were still 14–16.5px; now values are 18px and units 16px, and fields 48px tall.
  - **Fine-tune** was a small grey disclosure that didn't look clickable. It's now a full-width row like the Avatar tab's add rows: a sliders icon, "Fine-tune the timing", what's inside, and a chevron that turns when it opens.
  - The nudge still read like milliseconds: an old "1000" sat next to a small "s". The unit now reads "seconds" and the label "After this much quiet". An old millisecond value is converted on open (1000 → 1 second, at least 2), so Save shows and stores what was meant. The warning line is gone.

**State now**
Typechecks and builds. Not looked at in a browser.
- **Not changed, your call:** the admissions call (`server/voice/admissionsCall.ts:172`, `time-period: 1000`) and the roleplays (`server/voice/roleplays/shared.ts:41` defaults to 1000, `tanCustoms.ts:217` uses 6000) still use millisecond-looking values. They are read as seconds, so today their nudge waits 17 minutes or more. Changing them to seconds would make demos start nudging, so they were left alone.
- The pace presets are our grouping of the engine's settings, not something the voice server defines.

**Files**
src/routes/dashboard.flows.$flowId.behaviour.tsx, src/lib/dashboard/knobs.ts, src/components/dashboard/KnobInput.tsx, src/components/dashboard/kit/CopySettingsMenu.tsx (new), src/routes/dashboard.flows.$flowId.voice.tsx, src/server/dashboard/store.server.ts, src/lib/docs/agent-pages.tsx, src/styles/dashboard-m3.css, mindsets/voxio-users.md

## 2026-10-25 — Avatars: faces first, grouped by flow, and safe to delete

**What changed**
- **First visit:** with no faces, the upload is the page, with one line on what a face is for and the tips beside it.
- **After that, faces come first.** **Add a face** is the filled button in the header and opens the upload in place.
  - Faces are grouped by the flow that uses them (its looks and smooth changes both count). Each group is titled with the flow's name and links to its Avatar tab. Faces no flow uses come last, under "Not used yet".
  - A search ("by face or flow") appears past eight faces.
- **Each card:** click the face to play it bigger (the Avatar tab's player). Under the name, the other flows that use it, or when it was added. A ⋯ menu holds **Copy face ID** (shows Copied) and **Delete**; it's always visible, so it works on touch.
- **Deleting is safe.**
  - A face no flow uses is deleted with Undo, as before.
  - A face in use opens "Delete “Margaret”?", lists the flows that use it, and says their video calls lose the face. **Keep it** or **Delete anyway**.
  - `/api/faces` DELETE refuses too: only the owner's own face (403 otherwise), and a face in use answers 409 with the flows' names unless `force=1`. Before, any delete went straight to the SDK and left flows pointing at a face that no longer existed.
- **Admins:** a "Mine | Everyone's" switch, Mine by default. Everyone's adds the faces the pinned flows use, as the Flows list does, with the owner's name. Only the owner can delete; the menu says so.
- **One upload, shared with the flow's Avatar tab** (`kit/FaceUpload.tsx`). Several files at once, each named after its file, one at a time with its own status. "When to use it" shows only on a flow. Before, this page had its own single-file upload, with its own copy of the face tracking options.
  - **Face tracking** is under More options, Standard by default.
  - Upload is never greyed out: with no name it says what's missing.
  - Leaving the page during an upload asks first.
  - A dropped connection says so in words instead of "Failed to fetch".
  - After it's added: "“Margaret” is added. Use it on a flow's Avatar tab."
- **Faster:** the page loads faces and the flows that use them (`getFaceLibrary`, two small queries), not the whole account with every session.
- **Type:** names, tip titles, group titles' links and the upload's names 18px; everything else 16px. They were 14.5 to 17.5px.

- **The default look is always called "main"** (workflows ask for looks by name, and main is the default):
  - on a flow's Avatar tab the first look's name reads "main" and can't be edited;
  - **Make default** renames the chosen look to "main", and the old main takes the name the new one had; smooth changes that pointed at either name follow;
  - removing the default makes the next look "main", and its smooth changes follow;
  - uploading a flow's first looks names the default "main" (the file called main, or the first).

**Why**
The page was built for uploading, but most visits come to find a face. A face could be deleted from under a flow with no warning, nothing said where a face was used, and faces from several patients sat in one flat grid, many of them called "main". See "Avatars" in `mindsets/voxio-users.md`.

**State now**
Typechecks and builds. Not looked at in a browser, and the delete guard hasn't been tried against a real face.
- A face used on more than one flow shows in each of those groups.
- A face used only by someone else's flow (not yours, and not pinned) still counts as "Not used yet" for you.

**Files**
src/routes/dashboard.avatars.tsx, src/components/dashboard/kit/FaceUpload.tsx (new), src/lib/dashboard/faces.ts (new), src/routes/dashboard.flows.$flowId.avatar.tsx, src/routes/api.faces.ts, src/server/dashboard/api.ts, src/lib/dashboard/types.ts, src/styles/dashboard-m3.css, mindsets/voxio-users.md

## 2026-10-25 — Test redesign built, then parked

**What changed**
A redesign of the Test screen was built: a start card saying whether the run has a face, one-click start, "For this run" (voice, language, speed), a Messages log button, two layouts per call, and a "How did it go?" end card. Then it was reverted. The Test screen is exactly as it was before this session.

**Why**
Testers are using the current Test screen right now. The owner found the redesign good and logical, but not for now.

**State now**
The design, what changed and the full code (a patch, `RunOptions.tsx` and the CSS) are in `docs/TEST_SCREEN_REDESIGN.md`, with steps to bring it back. The patch was checked against the built code before reverting.

**Files**
docs/TEST_SCREEN_REDESIGN.md (new). Test files restored: src/routes/dashboard.flows.$flowId.test.tsx, src/components/dashboard/test/BrowserTest.tsx, ChatTest.tsx, LivePanel.tsx, src/styles/dashboard-pages.css, the Test parts of src/styles/dashboard-m3.css.

## 2026-10-25 — Flow overview rebuilt around "is it working, and what now?"

**What changed**
- **Status by the name:** the same Live, Quiet, Tested or Not tried chip as the Flows list, with the reason on hover. The meta line also says whose flow it is (for admins) and when it was made. The Created chip is gone.
- **One next step:** a card under the header says where the flow stands and why ("Tested, not live yet. Tested 3 times. Connect a number or website to go live."), with the step as its button: **Try it**, **Connect**, **Last session** or **Test**. It is the only filled button on the page. The Flows list and the overview now read status from one place.
- **Build rows:** Workflow (step count, Edit workflow) and Connected to (numbers, website, webhook, Numbers & calls), as quiet rows like the Flows list's Needs you.
- **Buttons:** Test left the top group (the next step covers it). Duplicate and Export are a quiet pair at the top right, 44px and 16px.
- **Sessions:**
  - real sessions by default once there is one, with a **Show** filter (Real sessions, With tests, Only tests). Before the first real session the tests are the history, so they show with no filter;
  - a just-run test still opens with tests shown;
  - a new **What was said** column (the caller's first words), hidden on phones;
  - no status recorded shows "—", not "Completed", with **Not recorded** as a filter choice;
  - the empty state says "Try it in Test", not "Place a call from Numbers & calls";
  - cells 18px; chips, status and replay buttons 16px.
- **Activity, above Sessions:** the chart and its numbers (sessions, minutes, average length, tests) for the chart's own range, so the page shows one count, not two. Real sessions once there is one; before that the tests are charted, titled "Tests so far". It was folded at first; the owner asked why there was no chart with sessions on the page. The channel bar and its hard-coded colours are gone.
- **Owner name:** `getFlowDoc` adds `owner` when an admin opens someone else's flow; `owner` is a protected key in patches.

**Why**
The page showed totals that counted tests as use, numbers that disagreed with the chart, and "Completed" for sessions with no status, and it never said what to do next. See "Flow overview" in `mindsets/voxio-users.md`.

**State now**
Typechecks and builds. Checked against the owner's screenshot: the next-step text was losing to `.db-wfcard.is-d` (fixed), tests were hidden on a test-only flow (fixed), the toolbar was 13–14px (now 16px), and "Connect a number" repeated the card's Connect (now "Numbers & calls").
- Still slow on big flows: the flow loader reads every session in full, because saving (`mutateFlow` / `flowOps`) diffs `sessions`. Fixing it means taking sessions out of `FlowDoc` and the save path, a change of its own.
- Tests on backend-run flows are known only from `test: true` or this browser's list, so counts can differ between browsers.

**Files**
src/routes/dashboard.flows.$flowId.index.tsx, src/lib/dashboard/flowStatus.ts (new), src/routes/dashboard.flows.index.tsx, src/components/dashboard/SessionsTable.tsx, src/server/dashboard/api.ts, src/lib/dashboard/types.ts, src/styles/dashboard-m3.css, mindsets/voxio-users.md

## 2026-10-24 — Flows page: what needs you, and each row's next step; lighter Home

**What changed**
- **Needs you:** quiet rows above the Flows table say what to do, not how many there are:
  - "2 flows are tested but not connected. Connect a number or website"
  - "1 hasn't been tried yet. Try it in Test"
  - "1 had no real sessions in the last 7 days. See what happened last"
  Clicking a row filters the table to those flows. Nothing shows when there's nothing to do.
- **Next step per row:** the first row action changes with the flow's state and is labelled: **Try it**, **Connect** (to Numbers), **Last session** (to Overview) or **Test**. Duplicate and Delete stay as icons.
- **Admins:** a "My flows | Everyone's" filter, My flows by default. It only appears for people who can see other people's flows. The empty state checks everything they can see, so an admin with no flows of their own still gets the filter.
- **Flow column:** the initial-letter badge in front of each name is gone. It carried no information.
- **Status hint:** a tested flow that is already connected says "Waiting for its first real session" instead of telling you to connect it.
- **Home:** gets only the session fields it shows and searches (type, times, duration, status, numbers, the first 1,500 characters of transcript), not the wire logs, actions and recordings. On the largest account that is 0.25 MB instead of 0.61 MB, and 0.5 s instead of 0.9 s.
- **Left out on purpose:** charts and totals (Home has them) and a "failed calls" alert. 1,291 of 1,394 sessions have no status, and all 511 phone sessions show 0 seconds from the Mongo copy.

**State now**
Builds and typechecks. Not looked at in a browser.

**Files**
src/routes/dashboard.flows.index.tsx, src/server/dashboard/api.ts, src/styles/dashboard-m3.css, mindsets/voxio-users.md

## 2026-10-24 — Faster login

**What changed**
Measured from here to Neon (Singapore), each step after pressing Log in ran one after the other:
- waking the connection: ~1.0 s;
- finding the user: 0.4 s;
- the password check: 0.08 s;
- rehashing an old-backend password: +0.4 s;
- creating the session: 0.4 s;
- the login page reloading itself: 0.4 s;
- the admin lookup: 0.4 s;
- Home's overview: 0.4–1.0 s.

Three of those are gone:
- `startSession` puts the new session straight into the sign-in cache, and login primes the role cache (`primeRole`). The first dashboard page doesn't look up who you are or whether you're an admin.
- Login and signup no longer call `router.invalidate()`. It reloaded the login page only to be redirected away. `clearCache()` stays.
- Upgrading an imported bcrypt password to scrypt runs in the background. A failure is logged and retried at the next login.

**State now**
Builds and typechecks. About 1.2 s less per login (1.6 s for old-backend accounts). Still slow:
- the first query after Neon goes idle;
- the India–Singapore round trip on each remaining query;
- Home loading every session.

**Files**
src/server/auth.ts, src/server/session.server.ts, src/server/dashboard/store.server.ts, src/routes/login.tsx, src/routes/signup.tsx

## 2026-10-23 — Voice tab rebuilt around "how it sounds, how it hears"

**What changed**
- **Speaking comes first** ("How your agent sounds"), then Listening ("How your agent hears"). Both are in plain words.
- **Play sample:** the voice dropdown has a ▶ Play sample button, so you hear a voice before saving.
  - It opens a player in place under the voice settings, labelled "Sample of Thalia".
  - The player has play/pause, a waveform to click or arrow through, the time, and volume (mute plus a slider).
  - It stays open while you change voices, and each new pick loads and plays.
  - The player is the session replay's, moved to `kit/AudioPlayer.tsx`, so audio looks the same everywhere. Session replays gain volume and keyboard seeking too.
  - Samples are made by `scripts/voice-samples.py` with the voice backend's own TTS clients and stored in R2 under `samples/voices/<service>/<voice>.wav`. `/api/voice-sample` serves them, for logged-in users and only for voices in `src/lib/dashboard/voice-samples.json`.
  - The script loads only the Deepgram and Sarvam clients. The backend's `tts` and `services` packages import torch, which Windows Application Control blocks on this machine.
  - The 11 Deepgram Aura voices are done.
  - No samples for ElevenLabs, Google or Resemble: their voice is a pasted ID the person has already heard on that platform.
- **Provider tiles** show the reason to pick each one ("Fastest", "Best for Hinglish", "Indian voices", "Most natural"…) and where it processes the audio ("Audio processed in India / US").
- **A warning** when the agent speaks one language and listens for another.
- **Saved voices:** "Set here | Use a saved one". With nothing saved, it says where to save one instead of being greyed out.
- **Copy config** appeared three times. It is now once, in a ⋯ menu, as "Copy settings as JSON". There is a "Try it in Test" link in the header.
- **Look:**
  - one accent colour (the purple Speaking colour and the coloured left stripes are gone);
  - tokens instead of hard-coded colours;
  - speaker and ear icons (Speaking had the ⚡ bolt);
  - text at 18px (names, values, More settings) and 16px (labels, descriptions, notes).

**State now**
Builds and typechecks. Not looked at in a browser.
- **Sarvam samples:** not made. Both Sarvam keys returned 402 "Credits exhausted", and we're leaving Sarvam for now. Re-run with `--only sarvam` later; it skips what's already there.
- **Sarvam `bulbul:v2`:** Sarvam now refuses it ("deprecated, use bulbul:v3"), but the dashboard still offers it.
- **Not built:** voice cards with samples in a grid, and a live "hold to speak" listening test. The Play button sits in the voice cell, and listening is tried in Test.

**Files**
src/routes/dashboard.flows.$flowId.voice.tsx, src/components/dashboard/ProviderEditor.tsx, src/lib/dashboard/providers.ts, src/lib/dashboard/voice-samples.json, src/routes/api.voice-sample.ts, src/server/r2.server.ts, scripts/voice-samples.py, src/styles/dashboard-m3.css, src/styles/dashboard-controls.css

## 2026-10-23 — Import screens that don't jump

**What changed**
- Import a flow (from New flow and the workflow editor) and Import flows (several, from the Flows list) follow internal-shortlisting's resume upload.
- The drop area: one dashed box with an upload icon, "Add a flow file" and one line of help. It tints when a file is dragged over it.
- Line tabs across the top, full width with icons: **Upload | Paste JSON**, as on internal-shortlisting's "Upload \| Already uploaded". Before, swapping a tall text area for a short drop area made the dialog jump. Now both tabs show a box of the same 240px height, and switching is instant.
- 672px wide like the HR dialog, with a 56px-tall footer.
- Under the box, a row that is always there. It shows the file and its step count with a check, why it didn't read, or "No file chosen yet". With several files, the list scrolls inside a fixed slot, so the dialog never changes size.
- Footer: Cancel (40%) and Import / Create flows (60%), joined across the full width, never greyed out. Pressing with nothing chosen says what is missing.
- Type: titles and file names 18px; help, steps and status 16px.

**State now**
Builds and typechecks. Not looked at in a browser.

**Files**
src/components/workflow/Transfer.tsx, src/components/workflow/workflow.css, src/styles/dashboard-m3.css

## 2026-10-23 — New flow dialog, and dialogs that stopped short of the top

**What changed**
- **Start from** is a connected two-column grid: cells 2px apart, only the grid's four outer corners round, the chosen one tonal with a check. It becomes one column on a phone. The first template is the default, and "Import a file" comes last.
- Every dialog title is now 36px, the page-title size (the replay dialog keeps its own 26px).
- Template names say what the agent does: Simple conversation, Fast reply, Ends the call itself, Answers from your documents, Blank. Before they were technical ("Quick ack + main LLM").
- Type scale: the Name and Start from labels, template names and the name field 18px; descriptions 16px.
- Picking a template fills in the name with the template's name, unless the person has typed one of their own.
- The dialog is wide (up to 1040px).
- Footer: Import a flow (25%), Cancel (25%) and Create flow (50%), joined across the full width. Import moved out of the grid. Once a file is in, the button reads "Replace file" and a note under the grid says the flow starts from it.
- Sixth template, **Takes a message**: asks for a name, a number and a reason, then reads them back. This is the receptionist job most voice agents start as, and it needs no integration.
- Blank works again: an empty workflow is accepted as a draft. The `start_node` check applies once there are steps.
- Create flow is never greyed out. With no name it says "Give the flow a name." on the field. Import with no file opens the import dialog.
- Every dashboard `Dialog` now renders into the `.db` root through a portal. Rendered inside the page, a transformed ancestor gave `position: fixed` its own box, so the blurred backdrop started about 24px down and left a hard line across the top bar.

**State now**
Builds and typechecks. Not looked at in a browser.

**Files**
src/routes/dashboard.flows.index.tsx, src/lib/workflow/templates.ts, src/components/dashboard/ui.tsx, src/styles/dashboard-m3.css

## 2026-10-23 — Flows list rebuilt around "which agent, and is it working?"

**What changed**
- The table follows internal-shortlisting's openings table:
  - Name with a meta line under it.
  - Status as a chip, with the reason in its tooltip.
  - Numbers in tabular figures, and "—" when empty.
  - Optional columns behind a **Columns** menu, remembered per browser.
  - A pinned **Actions** column.
  - Cells at 18px; headers, meta and chips at 16px.
- Columns, in order:
  - **Flow** (name; under it Avatar, Phone or Voice, and the owner's name on someone else's flow);
  - **Status** (Live, Quiet, Tested or Not tried);
  - **Sessions** (real sessions only; tests are counted apart);
  - **Last session** ("3 days ago");
  - **Minutes**;
  - **Connections**.
  API key and Created moved to the Columns menu.
- Row actions cut from five to three: Test, Duplicate, Delete. Clicking the row opens the flow. Export is in the selection bar.
- The status filter replaces "activity". The default sort is **Recently used**.
- `listFlows` returns `tests`, `lastAt`, `kind` and `owner`, counted in one grouped query over the sessions table.
- Who wants what on this page is written in `mindsets/voxio-users.md` ("Flows list").

**State now**
Builds and typechecks. Not looked at in a browser.

**Files**
src/routes/dashboard.flows.index.tsx, src/server/dashboard/api.ts, src/lib/dashboard/types.ts, src/styles/dashboard-m3.css, mindsets/voxio-users.md

## 2026-10-23 — Dashboard data straight from Neon, page by page

**What changed**
- The dashboard no longer reads or writes flows through the Voxio backend. Everything goes to Neon through Prisma, the same tables the voice servers read. The backend is used only for voice: test calls, browser tests, outbound calls, plus face uploads (they need the face_detection service).
- Access follows the backend's database service (`routers/services.py`): a flow is reachable by its owner, or by an admin (`users.role = admin`). Nobody else gets a row back. Updates are keyed on the owner too.
- Writes follow the database service's rules:
  - a workflow needs a `start_node` that is one of its steps;
  - server-owned keys can't be patched;
  - faces get the `version` hash voicebot uses to refresh its cache;
  - new keys use its format (`vk_` + 64 characters);
  - deleting or rotating replaces the key, and numbers follow.
- Pages load only what they show:
  - the Flows list: names, numbers and minutes;
  - Home: sessions;
  - a flow: just that flow.
  Saves read and write only that flow (`loadFlow`, `mutateFlow`). The whole-account load is left for account pages, and parallel requests now share one query.
- Admin flows that used to be "live" have no overlay any more. Their settings save to the table like any other, which fixes the "Saved, then lost" bug.
- Admins also see the flows named in `VOXIO_FLOW_API_KEY_*` / `VX_FLOW_API_KEY`. `DASHBOARD_LIVE_EMAILS` is no longer used.
- Hover preloads are reused for 30 s (`defaultPreloadStaleTime` was 0).
- Plan: added section 11 to `docs/AI_ASSISTANT_AND_VAD_PLAN.md`.

**Why**
The dashboard took up to a minute. Measured on the largest account (482 flows): every page loaded the whole account (3.7 s, 2.2 MB), every save loaded it twice, and the backend took 5–10 s for each live flow. Each page is now one query: 0.4–0.85 s from here, almost all of it the India–Singapore round trip.

**State now**
Builds and typechecks. Not tried in a browser. Attaching a number is limited to the user's own flows. Still to do: host the server in Singapore next to Neon (each query would drop to a few ms); account pages (Voices, Knowledge, Settings) still load the whole account.

**Files**
src/server/dashboard/api.ts, store.server.ts, flows.server.ts, src/lib/dashboard/knobs.ts, src/router.tsx, docs/AI_ASSISTANT_AND_VAD_PLAN.md

## 2026-10-23 — Login and signup fixes

**What changed**
- Log in and Create account stay clickable. An empty or invalid field now says what is missing, on that field.
- A wrong password shows its message just above the button, with a link to the contact form.
- A "Forgot password?" link goes to the contact form for now.
- Messages clear as soon as you type.
- The login label reads "Email". Old-backend usernames still work.
- The show-password eye no longer disappears. Edge's own reveal button is hidden, and autofill no longer paints over it.
- Email and password (and name on signup) are now connected fields (`AuthGroup`): one unit, cells 2px apart, labels inside, errors under the group.
- Auth pages moved onto the type scale: 36px title, 18px body, inputs and buttons, 16px hints and errors.
- Copied `learn.md` and `rules/` from internal-shortlisting.
- Added `mindsets/voxio-users.md`: researched mindsets for the six Voxio roles.

**Why**
The pages broke the rules in `rules/ui.md` and `learn.md`: greyed-out buttons with no reason, a failure with no way out, and the error away from where the eye is.

**State now**
Builds. There is no real password reset yet; the link goes to the contact form.

**Files**
src/routes/login.tsx, src/routes/signup.tsx, src/styles/auth.css, learn.md, rules/

## 2026-10-22 — Soniox max speakers and speaker-label removal

**What changed**
Soniox STT settings gain "Max speakers" (shown when "Tell speakers apart" is on). The Say step gains two advanced switches, off by default: "Clean values before sending" (`remove`) and "Remove speaker labels" (`remove_stt`). Dropped the unused `speaker-lock` from the admissions call config.

**Files**
src/lib/dashboard/providers.ts, src/lib/workflow/registry.ts, src/server/voice/admissionsCall.ts

## 2026-10-15 — Tester guide for the OSCE scenarios

**What changed**
Added `docs/OSCE_SCENARIOS_FOR_TESTERS.md`. It covers:
- **How a session runs:** the interview, how to end it, the score and its bands, and the clinical-reasoning reflection.
- **The 18 points** every interview is marked on.
- **One section per scenario:** who the patient is, how they talk, what is hidden and what brings it out, what a good student does, and one thing to try.

**Why**
Testers had no context on what each scenario expects of the student.

**State now**
The 18 dashboard flows are 9 scenarios saved twice. Each pair was checked as identical (same account, same workflow fingerprint). Yamamoto and the Nakamura copy are noted as outside the 18.

## 2026-10-15 — Subtler group colours, matched to Echobotics

**What changed**
- New tokens on `.db`: `--cell` (4.5% ink dark, 3.5% light), `--cell-hi` (hover) and `--cell-sel`, a tonal accent at about 16%. Echobotics cells sit about 4% off the card (#141414 on #0a0a0a dark), and ours were 6% white over teal, which read as washed grey-teal. Every connected cell, field cell, toolbar cell and the provider group now uses these tokens (17 rules in `dashboard-m3.css`).
- Selected options are tonal (`.is-sel`: tint plus accent text) instead of filled. This covers chart Minutes/Sessions and the date range, Custom, This flow only / Shared voice, the chosen provider and the Default look. The solid accent is kept for the one main action (`.is-lead`: Save, New flow, Test, Apply, Send) and for Mute while muted.

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Voice, Behaviour, date picker and workflow card in the grouped style

**What changed**
- Custom date range popover: each end's date and time are one connected pair, and Cancel and Apply are one connected pair (Apply filled).
- Flow Overview: the workflow card is a "D", as on Echobotics' Next step. The card has a light accent tint, and Edit workflow fills its right edge with a 44px round end. It stacks on phones.
- Voice tab:
  - The Listening and Speaking headings are 24px.
  - This flow only · Shared voice · Copy config is one connected group.
  - The page header has a Copy config for everything: STT, TTS, shared-voice refs and audio settings.
  - Providers (Deepgram · Soniox · Sarvam, and Deepgram Aura · Sarvam · ElevenLabs · Google · Resemble) are one connected group with the chosen one filled.
- `ProviderEditor` lays fields out as connected cells (`FieldGroup`): short fields share a row (up to three), sliders go two to a row, and tag lists (Languages, Boost words) take a full row below. Corners are round only on the group's outer edge. The whole More settings row opens and closes it, and its fields use the same cells.
- Behaviour tab: one Copy config in the header replaces the per-section ones, the section headings are 24px and the labels larger.
- Dropdowns: 44px fields with 16px text. Menus have 48px rows edge to edge, the chosen row is neutral with its check, and the option notes still show beside the menu.
- Saving on these tabs shows the thinking orb in the Save button (from the earlier `SaveBar` change).

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Selection group springs into the toolbar; icon animations play once

**What changed**
- Flows: ticking rows no longer shows a separate bulk bar. A connected group (count · Export · Delete · Clear) springs in at the toolbar's right end, left of Import / New flow. It grows from zero width with a slight overshoot (motion spring: stiffness 520, damping 24) and pushes the add group along. It springs back out on Clear.
- `dashboard-motion.css`: the icon scenes no longer fire on hovering a table row (`[data-row-link]` removed from 32 selectors), only on the button or link itself. They play once on hover instead of looping (`infinite` became `1`, and the eye-off tick plays `2 alternate` so it ends where it began).

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Flows table: clipped names, labelled add buttons, M3 checkboxes

**What changed**
- Flow names in the Flows table use `clipName` (48 characters, cut at a word, full name on hover) and stay on one line, ellipsized past 36ch.
- Import and New flow show their labels all the time, still as one connected group with New flow filled.
- Row checkboxes in `.db-flows` tables are M3: an 18px box with a 2px outline. Checked, it fills with the accent and the check scales in. A 40px round state layer appears on hover and focus.

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Actions as expanding icon groups

**What changed**
- Flows toolbar: Import and New flow (filled) are one connected icon group that widens on hover to show each label. The home page's All flows link uses the same style.
- Flows table rows: Test · Edit · Duplicate · Export · Delete are one expanding icon group (36px). They're quiet until the row is hovered, and Delete turns red on hover.
- `docs/DESIGN.md` B2a records the rule.

**State now**
`vite build` passes. Not checked in a browser. The flow header (Test · Duplicate · Export) keeps its text labels, as asked earlier.

## 2026-10-15 — Lists, charts and date ranges in the Echobotics style

**What changed**
- `TableCard` is rebuilt after Echobotics' ListToolbar. It takes `title`, `description`, `search` (with `count`), `filters` and `actions` instead of `tools` and `count`.
  - The layout is a 20px section heading, one connected toolbar, the page's buttons at its right end, the table in a bordered box, and the pager under it.
  - The search cell shows "x of y" (the filtered count of the total).
  - Filter chips become toolbar cells: 40px, neutral surface, 2px apart, round outer ends.
  - It's used by the home page's Recent sessions, the Flows list and each flow's Sessions.
- `UsageChart` header: the title (18px) and one line ("1,240 minutes · last 30 days" or the custom dates) on the left. Metric and range are on the right as connected groups with the chosen cell filled, and a divider sits under the header.
- The range presets read 7 days · 30 days · 90 days (were 7 days, 1 Month, 3 Months). Custom is the group's last cell and opens the existing calendar (`DateRangeButton cell`).
- `docs/DESIGN.md` has a new section B2a with these rules.

**State now**
`vite build` passes. Not checked in a browser. The 12 months and All presets from Echobotics aren't added: `Range` only knows 7, 30 and 90.

## 2026-10-15 — Session dialog layout, M3 video sliders, natural video shape

**What changed**
- Session dialog: no KPI cards (minutes, channel, status). The title is 26px and the date 16px. The transcript is on the left under a 22px heading, with a copy icon at the heading's right. The recording is on the right and stays in view while the transcript scrolls. Website steps, actions and the Raw log sit under the transcript. Raw is a single button by the close button. Below 900px it becomes one column with the video first.
- `VideoPlayer`: the seek bar and a new volume slider (beside mute) use the dashboard's M3 slider, a thick track with a gap round a bar handle, recoloured for the black frame. The video has no fixed aspect ratio, so square or wide clips keep their shape, up to 72% of the screen height.
- The avatar look preview wrapper is renamed `.db-lookplayer`. It had reused `.db-player`, the session audio player's class, and was restyling it.

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Keep the agent's data lines in saved sessions; replay with sound

**What changed**
- `saveTestSession` and `getSessionRecording` no longer replace a saved transcript that has the agent's data lines (movements, expressions, end diagnosis, scores) with the voice server's transcript, which has only words (`hasData` in `server/dashboard/api.ts`). Before, the server's copy won whenever it had at least as many turns, so replays showed only speech.
- `VideoPlayer` autoplays with sound. If the browser blocks that, it falls back to muted and the mute button shows it. Session replay no longer forces mute.

**State now**
`vite build` passes. Sessions saved before this fix already lost their data lines and can't be recovered. New tests keep them, along with the raw log and website actions.

## 2026-10-15 — Session replay tools, custom video player

**What changed**
- A test now saves its website actions (`actions`) and its message log (`wire`) with the session, in `CallSession.extra`. The log is redacted in the browser as before, and only the last 300 entries are kept. `BrowserResult` carries `actions`.
- The session dialog (`ReplayDialog`) has a Copy transcript / Raw group beside the close button. It lists "What it did on your website" when there are actions. Raw opens the saved log in the same `WirePanel` as the live test, read-only with no Clear button.
- New `kit/VideoPlayer.tsx`: a custom player with a big play button, seek line, play/pause, back and forward 10 s, time, mute, download (fetches the file so signed cross-origin links save too) and full screen. It has keyboard shortcuts (space/k, ←/→, m, f), and the controls fade while playing. It's used for the look preview on the Avatar tab and the agent video in session replay, where the caller's camera still follows it.

**State now**
`vite build` passes. Not checked in a browser. Only sessions tested from now on have actions and a raw log; older ones show Copy transcript only.

## 2026-10-15 — Neutral surfaces for connected groups and fields

**What changed**
- Connected buttons (`.db-gbtn`), grouped fields (`.db-gfield`) and the Avatar add pair use a neutral surface, `rgb(var(--ink) / 0.06)` rising to 0.08 or 0.09 on hover, instead of the mint tonal fill. This matches the Echobotics form style and works in both themes.
- Field labels are 13px, sentence case and muted, and values are 17px. Focus shows a faint outline.
- The Default look shows a subtle selected state rather than a solid mint fill. Delete is red text on the neutral surface.
- Each look row has no boxed card: the thumbnail and its group sit straight on the section.
- Only the main action (`.is-lead`, e.g. Save, Test) keeps the accent fill. Mute (when on) and End in the live call bar keep their colours.

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Avatar tab redesign, grouped Save bar

**What changed**
- Avatar tab: the Looks and Smooth changes headings are 22px, and the two add options are 18px.
- Each look is a 64px thumbnail plus one connected group: Name · When to use it · Face ID (copy, shows "Copied") · Default / Make default · Play bigger · Delete.
- Clicking the thumbnail or the play button opens the look in a dialog player: black 16:9 frame, video with native controls, autoplay and loop, or the still photo.
- "Choose from your avatars" and "Upload new looks" are one connected pair that stacks below 840px.
- `SaveBar` (every tab): Discard and Save are one connected group. While saving, the thinking orb shows inside the Save button ("Saving"), not in the message area.

**State now**
`vite build` passes. Not checked in a browser. Restart the preview server to see it.

## 2026-10-15 — Quiet the Prisma "kind: Closed" errors

**What changed**
`src/server/db.ts` sends Prisma logs through events and drops "Error in PostgreSQL connection: Error { kind: Closed }" and similar closed-connection lines. Every other error, and warnings in dev, still print. `withDb` uses the same pattern.

**Why**
Neon closes idle connections when the compute suspends or the pooler drops idle clients, and each pooled connection logged one error line. No query failed: the next query reconnects, and `withDb` retries one that raced the close.

**State now**
`vite build` passes. If a real query ever fails with a closed connection outside `withDb`, it still surfaces as a thrown error in that request.

## 2026-10-15 — Test dialog: floating face by default, larger live bar

**What changed**
- A call with the agent's face now opens in Floating face. The saved layout key moved to `vx-test-layout-v2`, so earlier picks reset once.
- The layout picker (Side by side · Floating face · Face only · Chat only) and the Mute mic / End group are 44px tall with 15px text and 18 to 20px icons.

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Test dialog: larger controls, grouped buttons, steadier state

**What changed**
- Start talking (56px) and Settings for this test (48px) are the same width, up to 440px and centred. Cancel while connecting is a full 48px button.
- Mute mic and End form one connected group, with End tinted red. The message box and Send form another, with Send filled.
- After a test, View in sessions and Copy transcript are a connected group.
- Text in the test dialog is larger: 16px base, 17px state label, 22px connecting label.
- `LivePanel` shows a move between speaking, listening and thinking only after the new state has held 200 ms (`useSteady`). Connecting, ended and error show at once.

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-15 — Test page: clipped name, connected test tiles

**What changed**
- `clipName` / `NAME_MAX` moved to `lib/dashboard/client.ts`. The Test page heading and the test dialog title use the same 48-character whole-word cut as Overview, and the heading shows the full name on hover.
- Talk in the browser, Chat with it and Call my phone are now one connected group. The tiles sit 2px apart with 28px outer corners and 8px inner ones, and each keeps its own icon, text and button. Below 840px they stack, rounding the top of the first tile and the bottom of the last.

**State now**
`vite build` passes. The first run failed with Windows os error 1450 (out of system resources) while loading icon files, and the rerun was clean. Not checked in a browser.

## 2026-10-14 — Flow header: one-row name, connected button groups

**What changed**
- The flow name on a flow's Overview stays on one row. Past 48 characters it is cut at the last whole word with "…", and hovering shows the full name. CSS ellipsis covers narrow screens.
- The API key row (`KeyChip`, also used on Developers) has Reveal, Copy and Rotate as an M3 connected icon group. The hovered or focused button widens to show its label and closes again on leaving. Rotate still asks first.
- On the right are Test (filled), Duplicate and Export as one connected group with text, then the Created date.
- The new `.db-btngroup` / `.db-gbtn` styles are in `dashboard-m3.css`.

**State now**
`vite build` passes. Not checked in a browser.

## 2026-10-14 — First pass of design-brief fixes

**What changed**
- One filled button per screen. Edit workflow, Attach and the Voices Add buttons are outlined. The Test page fills only the first test that can run. Knowledge hides its header button while the empty state shows.
- Lip-sync options read Standard and Detailed instead of Wav2Lip and MuseTalk.
- Deleting a face, or an unused flow, happens at once with Undo. `undoToast()` in `components/ui/halo-toast.tsx` hides the item and sends the delete when the toast closes. Halo toasts gained an `action` button. A flow with connections or sessions still asks first.
- Sentence dashes in on-screen text replaced with full stops, commas or a middle dot.

**Why**
These were the violations listed in `docs/DESIGN.md` section B3.

**State now**
`vite build` passes. Not checked in a browser. Open items: `<Mock>` still renders nothing, and a pending Undo delete is dropped if the tab closes first.

## 2026-10-14 — Design brief for the whole UI

**What changed**
Added `docs/DESIGN.md`. It sets out who uses Voxio, the seven presentation rules (taken from the Echobotics hiring design brief), Material 3 tokens decoded from the Figma kit (colour roles, shape, type, state layers, breakpoints), text rules from the Echobotics house style, and a list of the places the dashboard breaks the rules today.

**Why**
Screens were being designed one at a time with no shared rules. The brief is the reference every UI change follows.

**State now**
Docs only, no code changed. The violations in section B3 are open and get fixed when each screen is touched.

## 2026-10-09 — 山本健二: emotion on (eleven_v3 tags)

**What changed**
The patient `llm` node has `emotion: true, emotion_tts: 'eleven_v3'`, so the engine appends `agent/assets/prompts/tagging/eleven_v3.md`. The patient prompt now allows English v3 tags in `speak`. A closing section caps them at about one per three replies, only on pain or hesitation, and bans stage-Osaka speech. Without it, the appended tagging prompt led to `[sighs]` on almost every line and to わて/まっせ. Checked over 3 replays: after the closing section, tags appear on 1–2 of 5 replies (pain lines only), with no わて/まっせ.

## 2026-10-09 — Test panel: user lines from `out.user_input`, extra keys as raw JSON; patient on eleven_v3

**What changed**
- The browser and avatar Test panels (`BrowserTest.tsx`) only showed the caller's words when the server sent `user_input` at the top level. A transcription step sends it as `{ out: { user_input } }`, so it never showed. Both places are read now, and a line already shown from the voice server's transcript isn't added twice.
- Any keys an `out` sends besides the spoken text and delivery settings (`frame`, `end_diagnosis`, `score`, `feedback`…) appear as a separate "Agent · data" bubble of raw JSON (`LivePanel.tsx`, `.db-bubble.is-data`). These bubbles are left out of the saved test transcript.
- The 山本健二 flow's TTS is now ElevenLabs `eleven_v3` with Riku (`KJje3wzepLiSIQjVGCB6`). Measured: a 2-sentence line took 4.5–6.5 s to synthesize (Otani: 28 s, not used).

**State now**
Built. Open finding (not fixed): the flow's `reset_frame` never runs. The `conditional` writes `__next_route__` into the shared state, and sibling `response1` takes that route as its own. Even if it ran, `set_expression` switches faces at once, so it would cut the pain face short.

## 2026-10-09 — Japanese patient → 山本健二 with avatar faces; face labels saved

**What changed**
- I rewrote the `vk_fwdjid…` flow. The patient is now 山本健二: 52, heavyset Osaka taxi driver, Osaka dialect. He has "left shoulder pain" that is really exertional angina he plays down; the cardiac red flag is the trap. The rubric's 5 case items and the STT key terms follow the new case. The voice is the ElevenLabs library's Riku (`KJje3wzepLiSIQjVGCB6`, deep middle-aged ja-JP male).
- Avatar: faces `main` / `chest_pain` / `shoulder_pain` (labelled from their clips) are on the flow with no transitions, and video is on (the same participants graph as Sampl_7). The patient LLM returns `frame` with `speak`, the way the roleplays do (Muthu, Tanaka, VPS); `response1` sends it. A new `reset_frame` out node then sends `frame: "main"`, so a pain face lasts one line.
- `/api/faces` ignored the label typed on the Avatars page. The SDK upload takes no label, so the face row had none. It now writes the label onto the row after upload. I labelled the three existing faces by hand.

**State now**
Built. Not tried live: whether the backend plays `reset_frame` after the line's audio rather than over it.

## 2026-10-09 — Japanese virtual-patient flow (account sk1@gmail.com)

**What changed**
A new flow on the account with user key `user_EFge…`: 「模擬患者(日本語)中村恵子・右肩の痛み(大阪弁)」, key `vk_fwdjid…`. It has the same graph as the Virtual Patient Simulator's flows: patient interview → `end_diagnosis` branch → scored feedback → clinical-reasoning debrief. All three prompts are in Japanese: an Osaka-dialect patient (58, frozen shoulder) who withholds information, a feedback prompt that follows the OSCE interview station with a voice-of-the-patient section, and a Socratic reasoning tutor. It has 23 Japanese rubric items in `feedback_questions`. STT is Soniox `stt-rt-v4` (`ja`, strict, medical key terms), and TTS is ElevenLabs Flash v2.5 with the library voice Hiyori (`AP6mVmGgRkbG5mCR7fCS`, native ja-JP). Japanese backchannels (はい。/ええ。…) are in `ignore-words` so they don't interrupt the patient. Inactivity nudges are off. It was created with the SDK (`flows.create`, gpu); the backend wrote the Neon row, and `on-backend` was set by hand.

**Why**
The user wants a Japanese version of the VPS based on the localisation research (D:\vx\research\reports).

**State now**
The flow is created but no call has been run yet. The VPS's own flows still had placeholder feedback and reasoning prompts at the time.

## 2026-10-09 — Jules-style ASCII logo; Word-style caret; branched docs menu

**What changed**
- **`AsciiAssembly`** (`src/components/AsciiAssembly.tsx`), modelled on jules.google's HeroLogo: "VoxioAgents" as ASCII art on a canvas (rasterised from real text: dense cells M W N K X, edges x l c, slivers : ; , . '). An endless random loop: a character pops out every 700 ms and drifts off in colour (leaving "."), and an "@" agent walks the grid to the nearest loose one, carries it back to its exact slot and puts it down. Same timings as Jules. Pauses off screen / in hidden tabs; still for reduced motion. On login/signup it fills the brand panel ("Voice agents that sound human."); on Contact it's a dark hero panel above the heading.
- **`SmoothCaret`** (mounted in `__root`): every text input and textarea on the site gets a drawn caret that glides to each new position (90 ms) like Word's smooth typing; solid while typing, blinking when idle. Number fields, selections and reduced-motion users keep the native caret.
- **`BranchedMenu`** (`src/components/ui/BranchedMenu.tsx`): the docs sidebar is now a tree; branches draw in when a group opens and fold away when it closes; the current page and its branch are lit. API as the user specified (items/defaultOpen/defaultActive/onSelect/colours/sizes/durations). Icons from `@hugeicons/core-free-icons`. No public source matched those props, so it's built here.

**State now**
Checked in Chrome on the dev server: Contact art, caret position after typing and Home, docs menu open/select. Login/signup art not seen (the test browser is signed in, so /login redirects).

## 2026-10-09 — Watermelon/shadcn components; date+time range; soft-delete flows; pagination; agent volume

**What changed**
- **Component base.** shadcn (`components.json`) installs Radix primitives into `src/components/base-ui`; dashboard pieces built from them live in `src/components/dashboard/kit`. Tailwind scans only `bklit`, `base-ui` and `dashboard/kit`. Their colours are `--sh-*` tokens on `:root` (light theme via `:root:has(.db[data-theme=light])`), because the site already owns `--accent`, `--border`… and popovers/dialogs are portalled outside `.db`.
- **Tailwind utilities are now unlayered.** `site.css` has an unlayered `* { margin: 0; padding: 0 }`, and an unlayered rule beats every layered one, so every Tailwind padding/margin was being zeroed. This was the bklit crosshair date chip "stuck to its text" (and the earlier `.bk-tip` workaround). The chip also uses the chart tooltip colours now.
- **Breadcrumbs:** Breadcrumb 1 pill (`kit/Crumbs.tsx`); last two crumbs on a phone.
- **Chart tabs:** Minutes/Sessions and 7 days/1 Month/3 Months use Tabs 25 (`kit/SegmentTabs.tsx`).
- **Custom range with time:** `kit/DateRange.tsx` (Starts / Ends rows, calendar + clock face `kit/ClockPicker.tsx`). A custom `Range` end can be `YYYY-MM-DDTHH:mm`; `rangeSpan`/`inRange`/`byRange` respect the time.
- **Delete a flow, keep its history.** The old delete removed the Prisma flow row, and sessions + webhook logs cascade with it (the SDK's `flows.delete` does the same). Now: key rotated through the SDK (re-keyed in the DB if that fails), `runtime.deleted_at` stamped, numbers detached (`markFlowDeleted`). Deleted flows load into `store.deleted`, leave the flows list, and their sessions show on Home tagged "Flow deleted". Confirm dialog = Dialog 3 with an "I understand" checkbox (`kit/DeleteFlowDialog.tsx`).
- **Pagination:** Pagination 15 (`kit/Pager.tsx`), rows per page 10/25/50; `usePaged` owns `perPage`.
- **Agent volume in browser tests:** Popover 4 (`kit/AgentVolume.tsx`). BrowserTest gives the SDK its own `<audio>` (`env.createAudioElement`) and sets its volume; the avatar video follows. The mic button now reads "Mute mic".

**Why**
User asked for these watermelon components; the date chip had no padding; deleting a flow must keep sessions.

**State now**
Typechecks; checked in Chrome on the dev server: breadcrumbs, chart tabs, date+time card (calendar, clock), delete dialog (opened/cancelled only), pager. Not done live: an actual flow delete (needs the user's OK — it changes their data) and the volume control in a real call. In `vite dev`, Tailwind sometimes misses classes in a newly created file until `bklit.css` is touched; production builds are unaffected.

## 2026-10-09 — Workflow templates rebuilt on the engine; flows list fixes

**What changed**
Templates (`src/lib/workflow/templates.ts`) rebuilt on jl-customs / nsdc-customs and the engine's node code: every template sets `start_node` and `variables`, replies loop back to `ask_for_input`, and "Branch on hang-up" uses a plain `llm` + `response` out step (a plain `llm` says nothing on its own) + a `done?` conditional. Workflows are normalised (`withStart`) at the one place the dashboard writes them to the database; the start step is `start_node` or the step nothing leads to, never key order (jsonb sorts keys). Flows list is newest first; "Create flow" is blocked while a create runs.

**Why**
Old templates: simple/ack/rag never listened again after one reply; hang-up never spoke the LLM's reply. A double-pressed Create made duplicate flows (one account: 21 flows for 7 names). start_node was lost when the store rewrote a workflow.

**State now**
All four templates pass the backend's AgentConfig check and build in WorkflowEngine. Not tried in a live call. Flows made from the old templates keep their old (broken) shape; duplicates are still in the database.

## 2026-10-08 — Fix: test kept only one agent turn

**What was wrong**
The "join one reply's sentences" change decided whether to join inside a React state updater, using a flag it also changed there. React runs updaters twice in development, and no caller lines arrive to split turns. So every agent reply was merged into the first one: 5 exchanges were saved as 1.

**What changed**
- Each agent line now carries a turn number, read outside the updater. A sentence joins the last line only when the turn matches. The turn goes up each time the agent waits for input, and each time you type.
- Saving or opening a session only uses the voice server's transcript when it has at least as many turns as ours.

## 2026-10-08 — Test transcript, session recording, chat sides

**What changed**
- **Removed:** "Uses your microphone. Leaving this window ends the call." and "Talking to it now — end the call below."
- **Agent speech in the test:** one reply can arrive as several `out` packets, one per sentence. These are now joined into one agent turn, until the agent waits for input or you type.
- **Recording and full transcript:**
  - New `sessionRecordOf` in `flows.server.ts` reads the voice server's own record with the user's account key, through `voxioagent/server` `sessions.get`.
  - `saveTestSession` stores its `recordingUrl` and its two-sided transcript when they are ready.
  - The session dialog fetches them on open if missing (`getSessionRecording`), keeps them, and shows "Looking for the recording…" or "No recording yet".
- **Transcript layout:** the agent is on the left and the person on the right. The person is called Caller on phone, Visitor on web and video, and User in chat. The "Caller" fact is shown only for phone sessions.

**State now**
`vite build` and the typecheck pass. Whether a recording shows depends on the voice server storing a `recordingUrl` for web sessions. Not checked in a browser.

## 2026-10-08 — Test console logs removed

The agent's lines show in the voice test now, so the `[voxio-test]` console logs and the SDK's `debug` output are gone.

## 2026-10-08 — Voice test reads the agent's `out` packets

**What changed**
- **Agent text:** the console logs showed the agent's words arrive as `{agent:{session_id, waiting_for_input:false, out:{speak:"…"}}}`, not as streamed `chunk`s. The test now reads `out.speak` (or `text`, `message`, `response`) and adds it to the transcript, with `<|…|>` markers removed.
- **Logs:** `[voxio-test]` logs now print JSON text, so a copied log shows the packet contents.

**Not fixed here**
The voicebot only mirrors agent output; it never sends what the caller said. Caller lines will show once it sends `{"type":"transcript","role":"user","text":…}`, which the test already reads.

## 2026-10-08 — Test dialog: fewer words, console logs

**What changed**
- **Removed:**
  - the "Say hello — what you and the agent say shows up here." line;
  - the "Show code" button (the code view no longer opens);
  - "— used while this is open, never saved".
- **Logging:** the voice test now logs everything to the browser console under `[voxio-test]`:
  - each raw `{agent:…}` packet;
  - each `reply`;
  - state changes, other messages and errors.

  It also turns on the SDK's own `debug` output, so you can see what the voice server actually sends.

**Why**
The transcript stayed empty, and this shows what is (or isn't) arriving.

## 2026-10-08 — Date picker, /filter search, live test transcript (voxioagent 2.0.2)

**What changed**
- **Date picker:** the "Choose dates" panel is replaced by a calendar button (`components/dashboard/DateRange.tsx`). It opens a one-month grid in the dashboard colours: click a start day, then an end day, then Apply. When a custom range is in use, the button shows it.
- **Search:**
  - Home's "All flows" filter is gone. Search takes `/filter <keyword>` (or just the keyword) and matches the flow name, call type, numbers, status and transcript. `getOverview` now sends each transcript as one short string so search can read it.
  - A flow's Sessions table works the same way.
- **Removed:** the "N sessions in this period" and "N of M sessions" counts.
- **Phone example:** the curl on Developers uses `$FROM_NUMBER` and `$TO_NUMBER` instead of numbers that looked real. The docs examples now say `+91XXXXXXXXXX`.
- **Cut-off pages:** the main column is a scrolling flex column, and pages could shrink inside it. That cut Avatars and the loading skeleton off half-way. Pages no longer shrink: `.db-main > * { flex-shrink: 0 }`.
- **Chart hover card:** it relied on Tailwind spacing that wasn't generated. It now has its own classes (`.bk-tip*`), with padding, a minimum width and bigger text.
- **Voice test, voxioagent 2.0.2:**
  - the agent's words now stream into the transcript from the data channel (the `reply` event);
  - a packet that carries what the caller said (`user_input` / `transcript`) adds a user line;
  - every `{agent:…}` packet the server sends now appears in the code view, along with `waiting for input` and `usage`. Streamed chunks are logged once, as the finished reply.

**State now**
`vite build` passes and there are no new type errors. Not checked in a browser: the extension wasn't connected, and the dev server needs a login.

## 2026-10-08 — Tables, date ranges, Avatars tips fix, page clean-up

**What changed**
- **Tables:** every dashboard table now sits in one table card (`components/dashboard/TableCard.tsx`), after internal-shortlisting's tables. It has:
  - a header bar with the title and count, plus search, filters and actions;
  - a tinted column row;
  - a "Showing X–Y of N · Page X of Y" footer with Previous / Next.

  Pages:
  - **Home → Recent sessions:** sessions in the chosen period, with search, an "All flows" filter and channel and status filters, 8 per page, and an "All flows" button.
  - **Flows:** the list is paged, 10 per page.
  - **A flow's Overview → Sessions:** search, channel and status filters, and paging. It still jumps to a session a test just made.
- **Usage chart:**
  - the title and total are bigger;
  - the range is **7 days · 1 Month · 3 Months**, plus **Custom**, which opens a start/end date panel (the floating panel);
  - charts and the Home figures follow the chosen range, through `Range`, `rangeDays`, `inRange` and `byRange` in `ui.tsx`;
  - Home and the flow Overview both use it.
- **Avatars:** the "For the best result" tips used the class `.db-tip`, which is also the chart tooltip's (`position: absolute`), so they floated to the top-right corner and the card looked empty. They're now `.db-advice`.
- **Removed:**
  - Home's "Here's how your voice agents did in the last N days.";
  - the Flows subtitle;
  - the Avatars subtitle;
  - the out-of-date "mock store" note in the New flow dialog;
  - on Developers, the "Or, with no build step…" sentence and the one-line descriptions.
- **Developers:** step 2's choices (Voice button, Headless session, Server, Webhooks, Phone calls) are now the code block's own tabs, a size bigger.

**Why**
Requested.

**State now**
`vite build` and the typecheck pass. Not looked at in a browser.

## 2026-10-08 — Cult UI pieces: code tabs, toasts, dock, floating panel, morphing test dialog, copy rows

**What changed**
Six components after Cult UI, ported to this app (no shadcn tokens) and styled in the dark blue and cyan theme, with light-mode values and reduced-motion handled. `sonner` and `lucide-react` are new dependencies; `motion` was already there.
- **Code block** (`components/CodeBlock.tsx`, `styles/codeblock.css`): tabs with a spring underline; code that slides and unblurs in the direction you switch; a copy button whose icon turns into a check; syntax colours kept. It takes `tabs` or `code`, and can be controlled. The /docs tabs (still synced per group and remembered) and Developers use it.
- **Copy rows** (`components/ui/copy-row.tsx`): the value plus a copy button in its own cell. Developers → SDK step 1 is now npm, pnpm and yarn rows and a script-tag row.
- **Toasts** (`components/ui/halo-toast.tsx`, on Sonner):
  - a frosted card with a slow gradient rim (default teal/blue/violet, success, error), a border trail on hover, letter-by-letter text and a close button;
  - mounted once in the dashboard shell and following its theme;
  - the workflow editor's old `wf-toast` is gone (save, save failed, "fix N errors first" are toasts now), and every save bar announces "Changes saved" / "Couldn't save" as a toast; the bar itself only says Saving… / Unsaved changes.
- **Dock** (`components/dashboard/Dock.tsx`): when the sidebar is collapsed to icons on desktop, the rail behaves like a vertical macOS dock. Items grow toward the mouse and neighbours ease aside. The flow's own menu does the same when it's folded to icons.
- **Floating panel** (`components/ui/floating-panel.tsx`): the workflow canvas's Templates button morphs into an anchored panel; Esc or a click outside closes it.
- **Morphing test dialog:** `Dialog` takes an optional `layoutId`. On the flow Test tab, each tile's button grows into its test dialog and shrinks back on close, with a hidden copy holding the tile's size.

**Why**
Requested: use these components across the dashboard and docs.

**State now**
`vite build` and the typecheck pass. Nothing has been looked at in a browser, so the motion details (dock sizes, morph timing, toast placement) still need a visual check. The workflow issues list keeps its old popover, because it opens itself on save errors.

## 2026-10-08 — Type during a test call

**What changed**
- The dashboard Test tab's live panel has a "Type instead of speaking…" box during a browser or avatar test. It calls `sendText()` from `voxioagent` 2.0.1, which is now installed: `{ agent: { user_input } }` goes on the call's data channel, the voice server sends it to the agent under the same session, and the reply is spoken like any other turn.
- The voice server doesn't echo typed lines back, so the panel adds them itself; they also go into the saved test transcript.
- The wire log ("Show code") shows each typed message, and errors now include the server's `detail`.
- If the server refuses a message (code `rejected` with no HTTP status), the panel says "That message wasn't sent: <reason>. The call is still on." instead of the connection-error text.

**Why**
The backend and SDK now support typed input on a voice session.

**State now**
`vite build` and the typecheck pass. Not tried in a live call. The agent's replies still only arrive as audio, so the panel shows typed lines but not the agent's answers as text. The website demos (`VoiceRoom`) and `/docs` don't have typed input yet.

## 2026-10-08 — Removed "Upgrading from 1.x" from the docs

**What changed**
The "Upgrading from 1.x" page and its "Reference" sidebar group are gone from /docs, and so is the Introduction's table row for the 1.x API (`initVoxioAgent` / `initVoxioChatbot`). /docs now has 18 pages, and `/docs/upgrading` returns the docs' "Page not found".

**Why**
Requested.

**State now**
`vite build` and the typecheck pass. The 1.x API still works in the package; it just isn't documented.

## 2026-10-08 — Themed code blocks; Developers page as steps

**What changed**
New shared `src/components/CodeBlock.tsx` (styles in `src/styles/codeblock.css`) renders code in Voxio's own look: the site's translucent dark panel, a tab bar with a teal underline, line numbers, and an icon copy button. Syntax colours come from the brand palette: violet keywords, teal strings, blue functions. They're CSS variables, and the dashboard's light theme gets a deeper set. Highlighting uses `prism-react-renderer` (newly installed) with a small added shell grammar. The /docs code blocks and tabs now use it.

The Developers page is trimmed and reordered:
- The page subtitle, the account key help text and the Documentation card are gone, and so is the SDK card's tagline.
- The SDK card is now **1 Install** (npm or script tag, as editor tabs), then **2 Choose what to build**: Voice button, Headless session, Server, Webhooks or Phone calls.
- Each option shows one line of what it does, highlighted code, and a **Read the full guide** button.

**Why**
Requested: less copy, a clear order, and code that reads like an editor.

**State now**
`vite build` and the typecheck pass. Not looked at in a browser.

## 2026-10-08 — Docs rewritten to the house style, plus llms.txt and .md pages

**What changed**
Every /docs page was rewritten to a house style drawn from the Google developer style guide and from how ElevenLabs, Deepgram, Sarvam, Vapi and Stripe write their docs:
- Task headings start with a verb ("Start a session", not "Starting a session"); concept headings are nouns.
- Every code block has a sentence before it, ending in a colon, saying what it does.
- Placeholders are explained after the code with "Replace `X` with …".
- Examples show what you should see: `// → …` comments or a sentence.
- Pages where you build something open with "Before you begin", and every page ends with "Next steps".
- UI names are bold.
- The quickstart is now numbered steps (create a flow → copy its key → add the button → talk to it), checked against the real dashboard labels.

The style rules are at the top of `src/components/docs/parts.tsx`.

New building blocks:
- `Tabs`: tabbed code for HTML / JavaScript / React, npm / pnpm / yarn, and macOS / Windows. The tab you pick is remembered across pages.
- `Replace`, `BeforeYouBegin` and `NextSteps`.
- The "On this page" outline is now built from each page's H2s, so it can't go stale.

For AI tools:
- Each page has **Copy page**, **View as Markdown** and **llms.txt** under its lede.
- New routes: `/docs/llms.txt` (an index in the llmstxt.org format), `/docs/llms-full.txt` (every page in one file) and `/docs/<page>.md`.
- Pages declare their Markdown with `rel="alternate"`.
- All of these are generated from the same page bodies by `src/lib/docs/markdown.ts`.

**Why**
To match how established developer docs are written and to give AI tools a clean way in.

**State now**
`vite build` and the typecheck pass. The llms files were generated in-process and read through: 19 pages, 3 KB index, 53 KB full. The pages haven't been looked at in a browser.

## 2026-10-08 — Public developer docs at /docs

**What changed**
New public documentation at `/docs` for `voxioagent` 2.0.0, with 18 pages in five groups:
- **Get started:** Introduction, Quickstart, Keys and authentication, Servers and environments.
- **Add to your site:** Script tag, Voice button, Talking avatar, Chat, React, Customising widgets.
- **Build your own:** Headless sessions, Web actions, Errors.
- **Server:** Server SDK, Flows, Sessions and usage, Webhooks, Phone calls.
- **Reference:** Upgrading from 1.x.

The docs have their own shell (`src/routes/docs.tsx`): a header, a searchable sidebar that becomes a menu on phones, an "On this page" outline that follows the scroll, and previous/next links. All content is in `src/lib/docs/pages.tsx` and the building blocks are in `src/components/docs/parts.tsx`; styles are in `src/styles/docs.css`. `/docs` shows the site navbar (without the aurora backdrop); the docs bar sticks just under it, and the sidebar and outline sit below both. The navbar offset is computed from the site's `--header-y` and `--nav-h` and hasn't been checked in a browser at every breakpoint. The site navbar has a Docs item (book icon) after About Us, on the main site and on the product sites. The Developers page's SDK card used to describe a `@voxio/sdk` that doesn't exist. It now shows real `voxioagent` snippets with a "Read the full guide" link per tab, plus an "Open the docs" card. The mock-key note is gone. The site footer links to Docs.

**Why**
Users need documentation for the SDK, reachable from the dashboard.

**State now**
`vite build` passes. Not checked in a browser. Signup and login stay on our database. The backend's data service reads the same Neon `users` table, so an account made at /signup has a key the backend accepts without a separate registration step. Phone calls are documented as raw REST because the SDK has no calls API.

## 2026-10-08 — New and duplicated flows are created on the backend through the SDK

**What changed**
`createFlow` and `duplicateFlow` now create the flow on the backend first, with `voxioagent/server` `flows.create` signed with the creator's own account key (`User.apiKey`), on the SDK's `gpu` environment (`gpu.data.voxio.in`). The flow is then saved in our tables under the key the backend returns, with `on-backend: true` in its runtime JSON, and `onVoiceServers` treats that flag as testable. New code is in `src/server/dashboard/flows.server.ts`. If the backend refuses, nothing is saved and the user sees why. The workflow editor no longer offers the "Look up knowledge" step (`hidden: true` in the registry; existing steps still open), and the workflow page no longer loads the account's knowledge bases.

**Why**
Flows made in the dashboard existed only in our tables, so the voice servers didn't know their keys and they could never be tested.

**State now**
The 5 flows previously made in the dashboard were deleted from Neon, with their sessions, deliveries and own agents; the one attached number was detached. They were Clinic front desk and Sandbox (sample@voxio.in), Testr, and Roche ×2. 663 imported flows remain.

`vite build` passes. Not tried against the backend yet. It only works for accounts whose `User.apiKey` is also a key the backend knows (the imported accounts). A brand-new signup's key is minted by us, so the backend will refuse it. Edits made afterwards are still saved only in our tables; tests send them with the call, as for imported flows.

## 2026-10-08 — Test tab copy trimmed, Knowledge hidden

**What changed**
On the flow Test tab, the subtitle "Try your agent the way your callers will…" and the "This flow came from the old system…" notice are gone. Knowledge is hidden from the left rail and from the flow's Build menu (commented out like Apps). The pages still exist at their URLs, and the workflow editor's knowledge picker is unchanged.

**Why**
Requested.

**State now**
`vite build` passes. Flows created or duplicated in the dashboard still can't be tested: they exist only in our tables, so `getTestSetup` marks them not testable, and the voice server wouldn't recognise their key anyway.

## 2026-10-08 — Dashboard browser test sends the tester's own keys

**What changed**
The flow Test tab's browser and avatar test is back on. It uses `voxioagent/react` instead of the stub. Every setup request it makes carries the flow's key as `flow_api_key` (sent by the SDK) and the logged-in user's own account key (`User.apiKey`) as `user_api_key`. `getTestSetup` returns that key as `userKey`, and returns `avatarUrl`, so tests with a face run on `gpu.voice.voxio.in`. `AVATAR_VOICEBOT` now lives in `server/voice/servers.ts`. voxioagent 2.0.0 has no transcript event, so the live panel only shows transcript lines if the voice server sends `{ type: 'transcript' }` messages.

**Why**
A test should run as the person testing, with their flow and their account.

**State now**
`vite build` passes. Not tried in a live test yet. The phone test is still stubbed (`@voxio/server`; 2.0.0 has no `calls`). The tester's account key is visible in their own browser, which is the same key the Developers page already shows them.

## 2026-10-08 — 3D avatar runs on the account key, through a server proxy

**What changed**
The /avatar face demos now authenticate with the account (admin) key `VOXIO_USER_API_KEY` instead of `VX_FLOW_API_KEY`. The key stays on the server: `startRoomSession` gives the browser the placeholder `proxied` and `proxy: true`, and `VoiceRoom` passes the SDK an `env.fetch` that sends its two setup requests (`/rtc/ice-servers`, `/rtc/offer/audio`) to the new `/api/rtc-proxy`. The proxy removes the placeholder and forwards to `gpu.voice.voxio.in` with `flow_api_key` = `VX_FLOW_API_KEY` plus `user_api_key` = `VOXIO_USER_API_KEY`, which is what the site sent before the SDK switch. Sending the account key as `flow_api_key` gets a 401 ("No flow found for this flow_api_key"); the account key is not a flow key. It only serves a room session this server started for a face demo, less than 10 minutes old and not ended, and it overwrites `session_id` with that session's id. Audio and video still go directly between the browser and the voice server. Demos without a face and /webnav still use `VX_FLOW_API_KEY` directly.

**Why**
Avatar sessions got 401 with the RTC flow key. All flows and faces are registered under the account key, which must not reach visitors (a `VITE_` variable would put it in the page bundle).

**State now**
`vite build` passes, and the admin key is not in the client bundle. Not tried in a live call yet. `customs` and `participants` still come from the browser, so someone holding a live session id could change them for that one session.

## 2026-10-08 — Browser demos now connect through the Voxio SDK

**What changed**
`VoiceRoom.tsx` (/avatar and the browser demos) and `WebActionRoom.tsx` (/webnav) no longer open WebRTC by hand. Both use `createSession` from the published SDK (`voxioagent@2.0.0`, imported as `voxioagent/client`), which handles ICE servers, the offer, retries, mute, audio levels, the avatar video track and the data channel (`hangup`, `web_action`, `web_action_ack`). /webnav keeps its own page driver and timing: the SDK's built-in action runner is off, and actions are acked through the SDK. Our `customs`, `participants` and `session_id` pass through unchanged. Demos with a face always use `gpu.voice.voxio.in` (`room.ts`). `startRoomSession` no longer sends the account `user_api_key` to the browser. The dashboard chat test now imports `voxioagent/widget`. The browser and phone tests stay on the `voxio-sdk-off.ts` stub (tsconfig paths for `@voxio/react` and `@voxio/server`): they were written against an older SDK API (`useVoxioSession().transcript`, `Voxio.calls`) that 2.0.0 doesn't have.

**Why**
Use the SDK instead of the raw endpoints.

**State now**
`vite build` passes; /avatar, /webnav and / load. Not tried in a live call yet. Phone calls, flow editing and webhooks still use the raw endpoints.

## 2026-10-08 — RTC key headers, R2 session recordings

**What changed**
RTC calls send `flow_api_key` (was `api_key`); `/rtc/offer/audio` also sends `user_api_key` (`room.ts` hands `VOXIO_USER_API_KEY` to the browser). New `src/server/r2.server.ts` signs hour-long links to recordings in the private R2 bucket (or uses `R2_PUBLIC_BASE_URL` if set); `getSessionRecording` returns signed links, plus `extra.cameraRecordingUrl`, and the replay dialog shows avatar sessions as face + camera video.

**Why**
Voicebot renamed the RTC header (old one gets 422) and now uploads `session.mp4`/`camera.mp4` to R2.

**State now**
Signed links verified against the two test recordings (206 from R2). Replay dialog not tried in a browser. The user key is visible to /avatar visitors. The /avatar demo flow (`VX_FLOW_API_KEY`) is now listed on the dashboard for live accounts; its rows' recordings are signed and avatar ones (`extra.avatar`) play as face + camera video.

## 2026-10-07 — ICE api_key header, new avatar face

**What changed**
`/rtc/ice-servers` fetches in `VoiceRoom.tsx` and `WebActionRoom.tsx` now send the `api_key` header (the flow key already sent on `/rtc/offer/audio`). The /avatar face (`JEREMY_FACES`, shared by Jeremy and Marcia) is now `e3ec3023-7b7c-4559-8c21-ff4db0264bab`.

**Why**
The voice backend now requires `api_key` on the RTC connection; new face render requested.

**State now**
Typechecks for the touched files. Not tried in a live call.

## 2026-10-01 — Marcia Campbell avatar demo

**What changed**
New /avatar demo `mc` (Marcia Campbell, oncology first visit). The workflow is the one supplied as-is (Groq openai/gpt-oss-120b, patient persona + feedback grader); prompts live in `src/server/voice/prompts/roleplays/marcia/`, graph in `roleplays/marciaCustoms.ts`. Voice, ears, inactivity, pre-fire, wav2lip lip-sync and face are copied from Jeremy.

**Why**
Requested a second 3D-avatar scenario on Jeremy's setup.

**State now**
Builds. Not tried in a live call. The end-of-call `feedback`/`score` are not shown on the page (same gap as Jeremy's debrief), and there is no scene panel for this demo.

## 2026-10-01 — New face for Jeremy

**What changed**
Jeremy Lim's avatar on /avatar now uses face `41f2c30a-9e92-4026-a3aa-7954ba10517f` in place of `7f1c5a24-…`, and lip-syncs with `wav2lip` instead of `musetalk` (`src/server/voice/roleplays/jeremyCustoms.ts`).

**Why**
Requested swap to a new face render.

**State now**
Code updated; not yet tested in a live call.

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
- The voice is Sarvam `simran`, the same as NSDC. ElevenLabs was tried and reverted.
- `dump-customs.mjs lab` gives the English greeting with Roche, Soniox `hi`/`en`, and Sarvam
  `simran`.
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

## Apple font + date/time picker polish
- Sans font everywhere is now the Apple system stack (-apple-system / SF Pro), falling back to Inter: site.css, styles.css, dashboard.css, auth.css, docs.css, surfaces.css, docs pages.tsx. Serif accents and monospace unchanged.
- Calendar month/year: native <select> replaced by a pill + scrolling list popover (base-ui/calendar.tsx CalendarDropdown).
- ClockPicker: hand is a rotated group with eased transition, turns the short way, follows the pointer freely while dragging.
- SegmentTabs (Minutes/Sessions, 7 days/1 Month/3 Months) restyled as a Material 3 segmented button from the M3 Design Kit .fig (40px pill, 1px outline, tonal selected + animated check, 8%/10% state layers); date-range button matched. Calendar dropdown list no longer scrolls the page (clicks missed).
- Dashboard-wide Material 3 buttons: new src/styles/dashboard-m3.css (imported last in dashboard.tsx). db-btn = outlined 40px pill, db-primary = filled, is-on = tonal, db-danger = error outline, db-iconbtn = 40px round icon button, db-pills/db-seg = M3 segmented button with check, shadcn [data-slot=button] pill-shaped; 8%/10% state layers throughout.
- M3 toolbars: TableFilter is now an M3 filter chip with a menu (outlined when "All", tonal + check + × when filtered, sort variant); TableSearch is a filled 40px search pill with clear. All flows gets Connection / Activity / Sort chips. Flow header Created chip, row icon buttons, replay, Test chips, states, switch (44×24 M3 shape), slider (M3 bar handle + gap), dropdown fields and menus restyled in dashboard-m3.css. PopoverContent takes `container` so chip menus portal inside .db.
- Overview greets by first name ("Good evening, Ayush"); Settings drops "Your account.".
- Calendar restyled like Google's M3 date picker: 40px round days, today = outlined ring, month/year left + arrows right.
- Workflow editor: line style toggle (right-angle default / curves) saved in workflow.ui.edgeStyle; right-angle lines have a grip to drag the middle segment (saved in ui.bends, double-click resets, Tidy up resets); step menu 300px with foldable groups and a fold-to-icon-rail; settings panel 460px; clearer step descriptions.
- Field grid alignment: every field = 20px label + 40px control (switch fields no longer boxed cards), slider value fixed-width, More settings left-aligned, search caret fixed.
- Faces: uploads are copied to Cloudflare R2 (previews/faces/<uuid>.<ext>, media.preview + preview_type), served signed/public via playableUrl; Avatars page and flow Looks show the face (FaceMedia: video or photo). 10 older faces were also copied before the backfill was stopped.
- Canvas: right-angle lines now have a grip on every inner segment (Z = one vertical; backward/opened lines = 3 grips; Shift-drag splits a Z), stored as ui.bends {x1,y,x2}; duplicate button on each card + Ctrl+D; zoom controls follow light/dark; palette hint removed and search spaced.
- Date picker only goes back to the first session (or a year), not 1900.
- Step settings: footer has labelled Copy JSON (code icon) / Duplicate / Delete (red), icon-only when "Make first step" shows; CopyJson uses a code icon everywhere. Prompt and "What to say" grow with text up to 50vh then scroll, with "Open large" morphing to a full-screen editor (motion layoutId, GrowArea.tsx). Say can be left empty (no speak key). Panel opens on More when Setup is empty but More has values. AI steps: one Model picker (provider+model), "What it decides" moved to More, Emotion style only when emotion is on. Branch paths show "→ step" chips that open the target.
- Settings footer: tight row shows icons; hovering one slides its label open (others stay shut). AI step More tab grouped into cards: What it produces / What it remembers / Timing. Line × sits above the line, clear of grips; grips stack on top.
- Test: LivePanel rebuilt — centred connecting stage with a microphone hint, then orb/face/chat glide into place (motion LayoutGroup). Layout picker beside the controls: voice (Voice / Voice + chat / Chat), face (left/right/only/chat + small face/chat), two-way camera (split/them big/only them/only me/them + chat); choice remembered per kind. Inline agent volume slider. "Try different settings" replaced by a "Settings for this test" side panel with tabs (Speaking, Listening, Turn-taking, More) covering voices (saved or full provider editor) and every flow knob, change counts and reset.
- Avatar tab: loads faces only (getAvatars) instead of the whole account; face previews load one frame and play on hover.
- Workflow editor: freshly opened workflows no longer read as unsaved (baseline now includes top-level keys), so the button says Test, not Save and test.
- Test layouts reworked into kinds the tester shapes by hand: Side by side (drag divider to resize, ⇄ swaps sides), Floating (drag the window anywhere, corner to resize), Face only, Chat only; voice-only Voice / Voice + chat / Chat. Orb shown in a soft halo instead of scaled. Settings tabs share width (no scrollbar), settings button spans the row. SmoothCaret follows fields that move without scroll/resize and hides when they leave the page.
- Floating face can go to the bottom (stage fills the panel; limit counts the window's height); the face in the floating window no longer springs behind the frame while dragging.
- Chat tests: dashboard flows live on the GPU environment, so chat now goes to gpu.agent.voxio.in (VX_CHAT overrides) with the flow key as a flow_api_key header; chat.voxio.in returned 500 for these flows.
- Agent data lines (frame etc.) are saved with test transcripts (TestTurn.data) and shown in session replays as "Agent · data"; the saved transcript wins over the server's words-only one when it has them.
- Test chat: sending flies the message from the input into its bubble (Telegram-style, WAAPI, respects reduced motion); 'Say hello to start' removed.
- Plan written: docs/AI_ASSISTANT_AND_VAD_PLAN.md (AI Assistant with read/write tools + VAD custom dashboards, data model, phases, open decisions). No code yet.
- Plan: decisions recorded (own keys, multi-model, no connectors, state machine later); section 6 Read model added.
- Assistant v1 (read-only) built: src/server/assistant/{redact,tools.server,models.server,loop.server}.ts, src/routes/api.assistant.ts (SSE reply, ?models, ?mention), src/components/assistant/{Assistant,Markdown}.tsx, src/styles/assistant.css; top-bar button + Ctrl/⌘K in dashboard.tsx. 15 read tools verified against the real account (redaction narrowed so `key` fields stay; web caller turns unwrapped). Needs OPENROUTER_API_KEY / GROQ_API_KEY / ANTHROPIC_API_KEY in .env. Route tree regenerated with `npx tsr generate` (no build, to keep the running server intact).
- Assistant: OPENROUTER_API_KEY added to .env; partial flow names resolve when unique; answers follow the language of the user's sentence. End-to-end verified on Claude Sonnet and Gemini Flash via OpenRouter.
- Assistant: Gemini 3.1 Flash Lite (OpenRouter) added as the default model; reply language pinned to the language of the user's own message (detected server-side).
- Assistant answers: analyst-style instructions (answer first, what matters, what to do; no step-by-step narration), vx: refs in tool results rendered as clickable chips (GET /api/assistant?open= resolves them), ```chart blocks drawn with bklit (AnswerChart: bar/stacked/area) and only used when a picture helps; Telegram-style send animation in the panel.
- Workflow validator: counts workflow variables and history_key as available, and only flags a silent AI step when nothing uses its answers. Removes the false warnings on 山本健二 (editor and Assistant both).
- Assistant named "Ask Voxio": sidebar item (new `spark` icon) opening a full view at /dashboard/assistant; the side panel gains an expand button to it; both share one conversation (sync via storage + event). Empty full view shows the AsciiAssembly title ("ASK VOXIO") like sign-in/contact, with suggestion cards. On the full view the top-bar button and panel are hidden.
- Ask Voxio full view: no boxed card (open on the page, soft input), Wide view toggle in the header (remembered) to use the whole width.
- Ask Voxio can now change flows (v2, docs §8): propose_flow_settings / propose_voice / propose_step_settings / propose_add_step / propose_remove_step / propose_connections / propose_looks (src/server/assistant/changes.server.ts). Proposals are validated (knob catalog, workflow validator) and shown as change cards (before → after) with Apply / Discard, then Undo; apply refuses if the flow changed since. Saves go through the new shared applyFlowPatch (patchFlow now uses it too). Sessions stay read-only. Pending/applied changes kept in server memory for now. Verified: propose on 山本健二 greeting (not applied), apply + undo of a knob on Sample_6 (restored). Subtitle "Reads everything on your account" removed.
- Build fix: applyFlowPatch/readFlowDoc in api.ts wrapped in createServerOnlyFn (api.ts is imported by pages; plain exports pulled flows.server into the client build). vite build passes.
- Ask Voxio: @ mentions trigger after any non-letter (works after Japanese text/punctuation) and show "Looking…"/"Nothing called …"; full view scrolls with the page (one scrollbar) with the input sticky at the bottom; change cards say "Proposed change", the title, and where (flow › page › part) with an Open link, using the settings pages' own field names (Model, What to say, Speed…); Apply shows the thinking orb; replies refer to "the card above".
- Ask Voxio @ list: arrow keys keep the highlight in view; short list (steps of the open flow first, recent flows; faces/voices/knowledge only when typed); sessions only for a precise query (6+ chars of a session ID, or 4+ digits of a caller number), max 3, with a hint line.
- Font: Figtree everywhere (Google Fonts link in __root.tsx; site.css, dashboard, auth, docs, surfaces, styles.css, docs pages), system fonts as fallback.
- VAD plan revised: no transcript extraction; values come from the workflow (agent-decided fields), new calls only, captured by a webhook collector that forwards to the user's own URL.
- VAD plan simplified: user asks → Ask Voxio checks the workflow → suggests changes if needed → generates the VAD JSON; data read from the agent's state, no collector.
- VAD full plan written (docs §9): ask → check workflow → suggest changes → generate VAD JSON; spec, widgets, metrics, runWidget, tools, pages, sharing, storage, build order.
- VAD spec v1 (docs §10): JSON, fields, widgets, queries, full bklit chart list from upstream (14 charts incl. pie, ring, funnel, gauge, live line, scatter, radar, sankey), grid sizes, drag, adaptive resize, validation, VAD-key data endpoint, example.
- VAD v1 built (widgets only): prisma `Dashboard` model (needs db push); src/lib/vad/spec.ts (spec types, per-type sizes, normalize/validate, starter); src/server/vad/query.server.ts (runWidget on built-in fields; agent.* → "waiting"; day buckets fixed to include today); src/routes/api.vad.ts (list/get/create/save/remove/rotateKey, widget data by owner login or hashed vad_ key with rate limit and masked caller); src/components/vad/{Widget,Dashboard}.tsx (kpi with change/goal/spark, line/area/bar incl. stacked/horizontal via bklit, sessions table opening the call, text; react-grid-layout 2.2.4 pinned: 12 cols, drag by grip, resize se/e/s within min/max, add/remove, save/cancel, stacked column < 768px); pages /dashboard/dashboards and /dashboard/dashboards/$dashId; sidebar "Dashboards"; src/styles/vad.css. Verified runWidget on real sessions (22 sessions, avg 59s, 100% completed, table rows, agent field waiting, bad spec rejected).
- Ask Voxio: knows VAD = Voxio Agents Dashboard (not voice activity detection) and builds one instead of drawing charts in chat: new tools list_dashboards, get_dashboard, check_workflow_data, propose_dashboard (full spec, validated; card with widget list; Apply creates/updates, Undo deletes/restores) in src/server/assistant/dashboards.server.ts; vx:dash links. Verified: "Create a VAD for 山本健二" → card with 3 KPIs + chart + table. Spec validation hardened (query must be an object; own-key field check). Chat: follows new messages only when at the bottom (scrolls .db-main directly; keeps position on Apply); @ chips disappear when their text is deleted.

- Workflow editor: Import / Export buttons beside Templates. Export dialog copies the JSON or downloads `<flow>.json`; Import dialog takes pasted JSON or an uploaded/dropped file, checks it, and replaces the canvas (unsaved; Undo restores). New `components/workflow/Transfer.tsx`.
- Ask Voxio: change-card errors now show the real reason (missing `dashboards` table → run `npx prisma db push`) instead of "That didn't work."
- Flows page: Import button (table toolbar and empty state) and an "Import JSON" tile in New flow, which creates the flow from pasted/uploaded JSON (createFlow takes an optional workflow). Each table row has an Export button (copy or download).
- Docs: new "Build your agent" group (src/lib/docs/agent-pages.tsx): Workflows (JSON format, example, import/export, from code), Steps (every step + all settings + models + decided fields), Voice (every STT/TTS provider setting, emotion), Turn-taking (engine, reply timing, interruptions, inactivity), Avatar setup (faces, transitions, lip-sync). Setting tables are generated from registry/providers/knobs so they stay in sync.
- Flow overview header: Export button next to Duplicate.
- Docs nav is now multi-level: DocPage.parent, BranchedMenu draws sub-branches for the chosen page's children (all levels shown while searching). Server SDK pages nest under Server SDK.
- "Build your agent" docs rewritten from the engine source as a tree: Workflows (How a call runs, Values and state, Patterns, Import/export/code), Steps (one page per step + AI settings), Voice (Listening/Speaking with one page per provider + Emotion), Turn-taking (Interruptions, When the caller goes quiet), Avatar setup (Faces and expressions, Lip-sync).
- Fixed Filler's `variance` label/help: it's the chance of speaking (0–1), not "variety".
- Ask Voxio chats saved in the DB: new `assistant_chats` + `assistant_messages` (Prisma `AssistantChat`, `AssistantMessage`). Each answer is stored whole: text, every tool call (input + result), change cards (status kept in step on Apply/Discard/Undo). The server saves the question before the model runs and the answer when the turn ends (also when stopped or the tab closes). `src/server/assistant/chats.server.ts`; API: GET `?chats=1`, `?chat=id`; POST `{chatAction}`; reply takes `chat` and emits a `chat` event with the id. Browser-only thread storage removed.
- Sidebar: saved chats listed below Developers after a divider (newest first, open in full view via `?chat=`, delete with a second click, + for a new chat). `components/assistant/ChatList.tsx`.
- Ask Voxio token use: tool results more than 2 steps old are shrunk to a short note before each call (they were resent in full every step); Anthropic prompt caching on system, tools and conversation; the answer footer shows how many tokens were cached.
- Ask Voxio token diet (after research on Claude Code / Anthropic context engineering):
  - A: proposals no longer require reads first (propose tools read, validate and diff server-side); mentions are read only when needed.
  - B: the open flow's step outline (one line per step) goes in the system prompt, so no list_flows / get_workflow for "this flow".
  - C: tools sent by group (core reads always; edit / dashboards / library by keyword or follow-up), plus `load_tools` for the model to add a group. Tool definitions per step ~3.0K → ~1.2K (reads) / ~2.2K (edits). Fixed order keeps the prompt cache warm.
  - D: concise results: workflow outline trimmed, get_step shortens long prompts unless detail "full", get_flow lists only changed knobs, result cap 6000 → 3000 tokens.
  - E: get_workflow carries the flow key/ref; with the brief, a typical edit is brief → propose → answer.
  - F: footer shows "N new + M cached in · K out" (summary sent with `done`).
- Ask Voxio: one reply's proposals to a flow stack into one card (each builds on the last; Apply saves all; card updates in place). A proposal the flow has moved past is marked "Out of date" with a note instead of an error. Prompt: finish the whole edit in one reply.

## OSCE patient scenarios for SFBC (scripts/osce)
- 9 hand-written Japanese simulated-patient cases on the Yamamoto workflow structure: Tohoku (Sendai), Vietnamese intern (N4), Saitama elderly + daughter, angry Hiroshima carpenter, Hakata care worker (female angina), Nagoya elderly + wife (subdural haematoma), Tokyo beginner (postpartum mood), Okinawa (diabetic foot), Nepali mother + husband interpreting.
- `node scripts/osce/build.mjs` → `out/scenarios.json` (all, with variations + ElevenLabs eleven_v3 voice) and `out/<id>.json` (importable one by one).
- Companion cases add a `speaker` field (patient/companion); voice IDs come from a third-party list of the ElevenLabs library and need checking.
- Flows → Import now imports several flows at once: paste a list (or `{scenarios|flows|workflows: [...]}`) or upload several .json files; rename/untick each, then "Create N flows" (one by one, failures don't stop the rest, Retry). A `tts` block in an item (`service`, `model`, `voice`/`voice_id`) sets the flow's voice; `createFlow` accepts `tts` for known providers only. The New flow dialog's Import JSON tile stays single.
- Fix: the import/export dialog styles (components/workflow/workflow.css) were never loaded; Transfer.tsx now imports them.
- Flow → Avatar: "Add looks" takes several photos/clips at once. Each file's name (without extension) becomes the look's name (back_pain.mp4 → back_pain), editable before upload; a "main" file goes first when the flow has no looks. Uploads run one by one with per-file status; failed ones stay for a retry.
- Avatar looks: preview clips pause while uploading; per-row status is a small orb (no "Finding the face" text); adding looks turns on "Show your agent's face on calls"; each non-default look has "Make default" (moves it to the top — the first look is the default).

- OSCE scenarios: titles now "Japanese / English" (cases/*.mjs, build.mjs); out/ rebuilt.
- Flows list: checkboxes + select-all; bulk Export (one JSON list multi-import reads back, with voice) and bulk Delete with confirm. ExportDialog takes optional `data`.
- Flow Avatar: "Choose from your avatars" picker (multi-select grid from Avatars, search, in-use disabled); uploads here refresh the Avatars list (they were already saved there via /api/faces).
- Avatars: delete is one click: card dims with a spinner at once, disappears on success (was silent until reload, so people clicked repeatedly).
