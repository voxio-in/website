# Lessons

Mistakes in how we design, written as the habit behind them, not the one screen where they
showed up. Read before building UI. Newest first.

## Build the new thing from its sibling, not from scratch (2026-10-22)

**The habit.** Building a feature from its own description ("send test codes to a group") without first opening the thing next to it that already does the same job (meeting links). Three mistakes in one feature came from that. The test links used the fixed site address while every meeting link uses the address HR is on, so tests pointed at echobotics on localhost. Test invitations still emailed after the owner had said, more than once, that no email goes out, because the pause switch was added to one path and the others were never looked for. And the "dialog like Interview" became a toast for one person and a new list for a group, instead of the meeting link's own dialog.

**Why it happens.** Treating each request as a new feature and patching what the owner points at, one symptom at a time, instead of asking "where does the app already do this, and how?" Patches pile up, each one partly right, and the owner has to find the next gap.

**The rule.**

1. Before building, find the sibling: the feature that already makes a link, shows a code, sends an invite or books a time. Read it end to end, server and screen.
2. Copy its decisions, not just its look: how the URL is built (`requestOrigin`), which switch gates email (`lib/hiring/email-switch.ts`), which dialog shows the result (`MeetingLinkButton`'s `CopyField` and **Copy message** for one person, the booking list with **Download the list** for many).
3. When the owner sets a rule ("no email"), find every place it applies (`grep sendEmail`) and apply it to all of them in one change.
4. Say plainly what was and was not built. A toast is not a dialog; "for groups only" must be said, not implied.

**With technicalities.** Test links: `paperUrl(token, origin)` and `sendCompanyTest({ origin })`, with origin from `requestOrigin(request)` in the test, send-tests, paper and rounds routes. Email: `HIRING_EMAILS_PAUSED` in `lib/hiring/email-switch.ts` gates `tests.ts`, the meeting route, both `send-email` routes, messages and manager emails. Dialogs: `TestLinkDialog` (one person, the meeting link's parts) and `TestCodesDialog` (a group, the booking list's parts) in `components/openings/send-task.tsx`.

## The fewest actions: the finishing button is never a scroll away (2026-10-20)

**The habit.** Laying out a form top to bottom and putting the finishing button after the last field. On a real screen, with a pasted JD, that button sits below the fold, so every user does one more action (a scroll) before the one that matters.

**Why it happens.** We judge the layout as a whole page, not as the person filling it, who has their eye on the field they just finished.

**The rule.**

1. Count the actions from arriving to done. Remove any that are not a decision: scrolls, extra clicks, opening something only to close it.
2. The finishing action is visible at every moment: a floating or pinned bar, checked on a short laptop screen with real content.
3. Fields are only as tall as they need to be at first. Long content scrolls inside its own box, not the page.
4. A short explanation goes behind an (i) beside the thing it explains, not as a line that pushes the page down.

**With technicalities.** New opening (`app/(protected)/openings/new/page.tsx`). The Create bar was `fixed`, but the protected layout's `@container/main` gives fixed children a containing block, so it pinned to the foot of the page. It is now portalled to `document.body`, submitting through `form="new-opening"`. The description box is 9rem tall at first and grows to 40% of the screen. The fresher explanation is in an (i) tooltip. The candidate layout has the same `@container/main`, so any `fixed` element there has the same problem.

## A failure nobody sees is a feature that does not exist (2026-10-20)

**The habit.** Building the success path, then letting failure happen somewhere out of sight: a background job that logs a warning, a check that runs after the thing is saved, a second server that answers differently from the one we test on. The screen looks finished because the happy case works.

**Why it happens.** We test where it is easy: locally, with good input. The user lives in the other cases.

**The rule.**

1. Every action answers three questions: what just happened, can I take it back, what do I do next. That includes when it failed.
2. Refuse bad input before saving, with the reason, not after.
3. A failure gets a way out in place: Read it again, Add them by hand.
4. Check which server actually answers a route in production, not only which one answers locally.

**With technicalities.** New opening (bl.md §155). Production's nginx split sent Create to Nest, which never read the plan. The JD check ran only in the background read. The read failed into a `console.warn`.

## The reason belongs where the eye already is (2026-10-20)

**The habit.** Placing information where it is logical to read (the score next to the name,
left side, F-pattern) instead of where the eye actually lands. On the finalist list the eye
goes first to the loudest thing, the filled "Send offer letter" on the right. The coloured
score sat on the far left. Most people never saw it; the few who did had to travel across
the row to connect "88%" with the button.

**The second-level thought.** Steering works because of one moment: the eye lands on the
action, and in the same instant the mind asks "why this one?". If the answer is inside that
same glance, the click feels self-evident and the person believes they reasoned it out
themselves. That is the whole effect: we choose what they see at the moment of decision, they
feel they decided. If the answer is somewhere else, it fails two ways:

- Most people never find it. They click without a reason (no trust is built), or they
  hesitate and the screen loses them.
- The few who go looking now have to work: scan, match, compare. They become analysts, and
  the steering becomes visible. Once visible, it reads as pushing, and ownership is gone.

**The rule.**

1. Start from the landing point. Find the loudest element (the one filled button, the large
   number) and design backwards from it.
2. Put the reason touching the action, as its own joined control: "Avg score 88" in green,
   joined right after "Send offer letter" in the same group, and clicking it opens the
   evidence behind it. Squeezing the number into the action's label ("Send offer letter 88%") looked forced;
   a reason that is also the way into the detail reads as natural.
3. Clear the path. Anything between the landing point and its reason that says the same on
   every row (here "Round 5 · Offer", "Ready for the offer letter") goes.
4. The alternatives carry their reason the same way, in their own tone ("Avg score 22" in
   red beside their outlined button), so choosing differently is possible, but visibly the
   weaker choice.
5. A number appears only where it decides something. The average beside "Send offer letter"
   picks the hire; beside "Call now" it decides nothing and is noise (2026-10-20).
6. Headings and summary lines are for the people who read. The action is for everyone. Never
   rely on the line at the top to explain the button at the bottom right.
7. Past a handful, the group is the unit. When several people need the same step, the card
   offers that step once for all of them and the rows become names; single-person buttons on
   every row turn the card back into a table (2026-10-20). The heading is that step as a
   sentence ("Call 3 people"), not a section name ("In progress").
8. It must not look forced. If the steering is noticed as a trick, it fails; one joined chip
   that is useful by itself (it opens the rounds) is invisible steering.

**How to check before shipping.** Cover the screen and uncover only the loudest element and a
thumb's width around it. If what you see answers "why click this?", it is right.

**With technicalities.** `ProgressRow` in `components/openings/round-decisions.tsx`: the
last button of the row's `ButtonGroup`, right of the step, is "Avg score N" in
`getScoreTone(...).badge` (`components/openings/score-d.tsx`), opening the candidate on
Rounds; hidden when nothing is scored. Details stays where it was. Finalist rows drop the round and state text; backups keep their state line. bl.md §152.

## Showing the data is not the same as helping the decision (2026-10-20)

**The habit.** Treating "the number is on the screen" as done. The average score went in as
grey text in the middle of the row, then the finalist list got a filled button and a lead
line, and each step was shipped without stopping to ask what the HR person is doing at that
moment. Three times the owner had to point at the screen to show what was missing: the
average hidden when empty, the resume score contradicting the "–", and the grey 88% that
nobody would compare.

**Why it happens.** Moving fast and literal: building the item as worded, checking that it
compiles, and assuming the rest. Confidence that the change is obvious replaces walking
through the screen as the user. The existing visual language of the app (the score chip and
its colours) was not looked up, so the same meaning got a second, weaker look.

**The rule.**

1. Name the user's state before building. On the finalist list HR is comparing, so the screen
   must do the comparing for them: colour, order and position, before any text.
2. Encode the decision, not only the data. A number that decides something gets the app's
   tone for it (green, amber, red), and sits where the eye starts the row.
3. Least thinking, full ownership. The screen makes the best choice the easiest one (filled,
   on top, green) and keeps every other choice one quiet click away (outlined, Compare,
   Details). HR feels they chose.
4. One meaning, one look, one number. If two places show different numbers for the same
   person, the product contradicts itself; fix the source, not the label.
5. Before saying done, look at the real screen with the real data the owner has, and ask:
   what does the eye land on first, and does that answer the question this person came with?

**How to check before shipping.** Describe the screen in one sentence as the user sees it in
the first two seconds. If that sentence is not the decision they need ("Ayush is the one,
green and on top"), the screen is not done.

**With technicalities.** Finalists in `components/openings/round-decisions.tsx`
(`RoundsInProgress`, `ProgressRow`): average as a `Badge` with `getScoreTone`
(`components/openings/score-d.tsx`) beside the name; finalist state line muted; leader's
offer button the only filled one. The average includes `relevancyScore` so it matches the
candidate window (`lib/openings/hr-overview.ts`). bl.md §152.

## Help placed where it is easy to see, not where the user gets stuck (2026-10-14)

**The habit.** Building a helper and placing it where it is most visible, shown to everyone,
all the time, at full weight. It feels helpful because nobody can miss it. In practice it gets
in the way of every user who did not need it, and it competes with the one thing the screen is
for.

**Why it happens.** The helper was designed from the builder's side ("this feature should be
found") instead of the user's side ("at which exact moment does this person not know what to
do?"). Visibility was treated as the goal. The goal is relief at the moment of need.

**The rule.**

1. Find the moment of hesitation first. Ask: what is the user looking at when they stall? Put
   the help there, inside that thing if possible.
2. Show help when it applies, hide it when it does not. A user who already has what they need
   should never have to scroll past help.
3. Help is secondary. It never gets more visual weight than the screen's main task.
4. Let it leave on its own. Once the user starts doing the thing, the help folds away.

**How to check before shipping.** Walk through the screen as two people: the one who needs the
help and the one who does not. If the second person is slowed down or distracted, the help is
in the wrong place or shown at the wrong time.

**With technicalities.** First seen on New opening (`app/(protected)/openings/new/page.tsx`):
standard roles sat as a large tinted block between the role and the description. They now live
inside the empty description, open with `Expand` while it is empty, and fold away on the first
keystroke or paste.
