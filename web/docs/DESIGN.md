# Voxio design brief

How every screen in Voxio is presented: the dashboard, the test rooms, the login pages and the
marketing site. The product docs (`../PRODUCT.md`, `DASHBOARD.md`) say what Voxio does. This
says how much of it a person sees, and when. Every UI change follows it.

Written 2026-10-14. Adapted from the Echobotics hiring design brief
(`D:\ci\internal-shortlisting\docs\hiring-design-brief.md`) and the Material 3 Design Kit
(`Material 3 Design Kit (Community).fig` in this folder's parent).

# Part A. Without technicalities

## A1. Who we are designing for

Voxio has no self-serve signup and no free tier. Every customer comes through a scoped
engagement. So the dashboard is not a builder's playground for strangers. It is used by four
people, in this order of how often:

- **The person who builds the agent.** Usually someone on our team, sometimes a customer's
  technical lead. Builds the flow, picks the voice, connects the number, tests it. Knows the
  domain, may not know what a turn timeout is. Uses a laptop.
- **The customer's operations lead.** A clinic manager, an admissions head, a training
  coordinator. Wants to know whether the agent is doing its job: how many calls, what happened
  on them, which ones went wrong. Opens the dashboard once a day or less. Will not learn a tool.
- **The customer's developer.** Connects the webhook and the API key, then leaves. Needs the
  key, a working snippet and proof that the webhook fires.
- **The person who tries it.** A buyer on the marketing site or in the demo account. Has
  ninety seconds. Wants to hear the agent, not configure it.

What this means: the default reader of any screen is someone who did not build the thing they
are looking at. Engine settings exist for the first person only, and only when they go looking.

## A2. The seven rules

1. **It works with no setup.** A new flow comes from a template that already talks. Name it,
   press Test, hear it. Voices, behaviour and the avatar have working defaults and stay out of
   the way until someone opens them.
2. **One loud action per screen.** Test on a flow. New flow on the flow list. Save when a
   draft has changes. Everything else is outlined, tonal or a text button.
3. **Show a feature when it applies.** The avatar tab when the flow has a face; the webhook
   delivery log after the first delivery; sessions after the first session; engine settings
   under Advanced; a warning only when something is wrong.
4. **Never block.** Validation warns and lets you save; only a graph the engine cannot run
   stops a save. Missing pieces are shown as a next step, not a locked screen.
5. **Plain words, not our concepts.** "Waits 0.8 s after you stop talking" rather than
   end-of-speech timeout. "Face detector" rather than s3fd. "Speech to text" rather than STT.
   The engine's names live in Advanced and in the developer docs.
6. **Undo over "are you sure".** Deleting a face, a source or a node happens at once with
   Undo in a snackbar. A dialog is kept for what cannot come back or reaches outside the
   dashboard: rotating a live API key, deleting a flow with a phone number on it, placing a
   real call.
7. **The read-only view is small.** The operations lead's view of a flow is calls, outcomes
   and the ones that went wrong. It works on a phone. Building lives somewhere else.

## A3. What each piece looks like

- **Creating a flow.** One field (name) and a template picker with a sensible one chosen.
  Create lands on the Test page, not on an empty canvas.
- **Testing.** The Test page leads with one button that starts a conversation in the browser.
  Phone, avatar and web-action modes are chips beside it. Settings for the test stay collapsed.
- **Saving.** The save bar appears only when there is a change, and says how many. Leaving
  with unsaved changes keeps the draft rather than asking.
- **Deleting.** Immediate, with Undo for about six seconds. Bulk delete takes one Undo.
- **Errors.** Say what happened and what to do, in one or two sentences. Never a stack trace,
  never "something went wrong" alone.
- **Mocked or demo data.** Labelled where it shows, once, in plain words: "Demo data. Calls
  here are not dialled."
- **Empty states.** One sentence and the one action that fills it.

## A4. How text reads

Every word on screen follows the Echobotics house style
(`D:\ci\internal-shortlisting\docs\house-style.md`):

- Plain, short, specific. Say the fact or the action, then stop.
- No em or en dashes in sentences. Use a full stop, a comma or "and".
- No exclamation marks, emoji, "…" for effect, or brackets for side remarks.
- No filler ("simply", "just", "basically"), no reassurance ("don't worry"), no metaphors.
- The product does not say "I". "Saved 3 changes", not "I saved your changes".
- A middle dot separates short values: "Clinic front desk · 180 sessions".
- Buttons are verbs: Test, Save, Add source, Rotate key.

The marketing site keeps its own voice but follows the punctuation rules.

## A5. Parked

Whether the operations lead gets a separate login with a reduced view, or a shared link like
the Echobotics manager page. Whether Voices and Avatars stay top-level or move inside a flow.

# Part B. With technicalities

## B1. Material 3 mapping

| Need | M3 piece | Ours |
|---|---|---|
| The one action | Filled button | `.db-btn.db-primary`, one per screen |
| Secondary actions | Outlined / tonal / text button | `.db-btn`, `.db-btn.is-on` |
| Modes and filters | Filter chip, segmented button | `.db-pills`, `.db-seg` |
| Brief undoable result | Snackbar | toast with an Undo action |
| Interrupting decision | Dialog | key rotation, deleting a flow with a number, real calls |
| Quiet status | Badge (dot or count) | unsaved count on Save, error dot on a node |
| Hidden detail | Expansion / list | "Advanced" sections, collapsed by default |
| Layout | Canonical layouts, 8dp grid | rail, top bar, content, optional side panel |

## B2. Tokens

Taken from the kit and mapped onto ours. Colour stays Voxio's (`--db-accent` mint); the M3
roles say where each colour goes.

- **Colour roles.** Primary for the one action and selection only. Surface container levels
  (lowest to highest) for depth instead of borders and shadows. Outline for outlined buttons
  and fields; outline variant for dividers. Error only for errors. Never a raw hex in a
  component; add a token in `dashboard.css` if one is missing. The ~100 raw
  `rgba(94, 230, 200, …)` uses move to `var(--db-accent)` when touched.
- **Shape.** Corners from the M3 scale only: 4 (extra small: chips' inner bits, tooltips),
  8 (small: chips, menus), 12 (medium: cards), 16 (large: sheets, side panels),
  28 (extra large: dialogs), full (buttons, pills, search).
- **Type.** Body medium 14/20 for most text. Label large 14/20 medium for buttons. Title
  medium 16/24 medium for card titles. Title large 22/28 for page titles. Headline small
  24/32 for KPIs. Label small 11/16 for chart axes. No other sizes.
- **Spacing.** Multiples of 4, mostly 8. Page gutter 24 on desktop, 16 on phones.
- **State layers.** Hover 8%, focus and press 10%, drag 16%, as `dashboard-m3.css` already does
  for buttons. Rows, chips and nav items get the same.
- **Elevation.** Levels 0 to 3 only. Menus and popovers at 2, dialogs at 3. Cards sit flat on
  a surface container.
- **Motion.** M3 standard easing `cubic-bezier(0.2, 0, 0, 1)`, 150 to 300 ms. Respect
  `prefers-reduced-motion`.
- **Breakpoints.** Compact under 600, medium 600 to 839, expanded 840 and up. Under 840 the
  rail becomes a top bar and the flow panel becomes tabs.

## B2a. Lists, charts and dates

Taken from Echobotics (`D:/ci/internal-shortlisting/components/ui/`: `list-toolbar.tsx`,
`chart-header.tsx`, `range-filter.tsx`, `section-heading.tsx`).

- **Heading sizes.** Page title 24 to 30px. A section heading outside any card is 20px
  (`.db-tsection-title`). A card or chart title is 16 to 18px with one muted line under it.
- **Lists** use `TableCard`: section heading, then one connected toolbar, then the table in a
  bordered box, then the pager.
  - The search cell takes the spare width and shows "x of y" at its right end, so a filtered
    list never looks complete.
  - Each filter (channel, status, sort) is its own cell in the same group: 2px apart, small
    inner corners, round outer ends, neutral surface.
  - The page's buttons (Import, New flow, All flows) sit at the toolbar's right end as their
    own connected group. Only the main one is filled.
- **Actions are expanding icon groups** (`.db-btngroup.is-icons`): icon-only connected buttons,
  and the hovered or focused one widens to show its label, then closes again. This covers the
  toolbar actions, each table row's actions and the API key row. In table rows they stay quiet
  until the row is hovered.
- **Charts.** The header is the title and one line ("1,240 minutes · last 30 days") on the
  left, the controls on the right in one row, and a divider under it. Every choice is a
  connected group with the chosen cell filled.
- **Dates.** Presets as one connected group: 7 days · 30 days · 90 days · Custom. Custom is the
  last cell and opens the calendar; once picked it reads the range ("5 Oct – 12 Oct"). The line
  under the chart title repeats the period in words.

## B3. Where the code breaks the rules today

Found 2026-10-14. Fixed the same day unless marked open.

- **Rule 2.** Fixed. A single filled button on each screen: Test on a flow's Overview, the first
  runnable test on the Test page, Call now on Numbers. Edit workflow, Attach and the Voices
  Add buttons are outlined. Knowledge hides its header button while the empty state shows.
- **Rule 5.** Fixed. The lip-sync options read Standard and Detailed instead of Wav2Lip and
  MuseTalk. `s3fd` / `dwpose` and STT / TTS were only values and comments, not on screen.
- **Rule 6.** Fixed. Deleting a face, or a flow with no connections and no sessions, happens at
  once with Undo (`undoToast` in `components/ui/halo-toast.tsx`). A flow that has connections
  or sessions keeps the dialog, since its API key may be in use outside. Open: a pending
  delete is dropped if the tab closes before the toast does.
- **Rule 3.** Open. `<Mock>` still renders nothing, by an earlier decision. Mocked features
  (avatar upload, knowledge sources, Shopify) look real.
- **A4.** Fixed in on-screen text. Ranges (10–20, A–Z) and a lone dash for an empty value stay.

## B4. Checking a screen

Before a UI change is done:

1. Count the filled buttons on each state of the screen. One, or zero while nothing can be done.
2. Read every label aloud. If a customer's operations lead would ask what a word means, change it.
3. Find every destructive action. Undo, or a dialog that names what reaches outside.
4. Check the empty state, the error state and phone width (375 px).
5. `npm run build` passes.

## B5. Open

Testing these rules with a real customer's operations lead before more is built on them.
