# UI rules: lead the eye, convert the mindset

Read this before designing or changing any screen. It decides what a screen shows, in what
order, and how it brings every user round to the way of working we want. For how things look, see `CLAUDE.md` §1. Buttons and icons
follow `rules/material.md`, and motion follows `rules/animations.md`.

## The two things every screen does

1. **Follows the eye.** We know where each user looks first, next and last, and we put the
   right thing there.
2. **Converts the mindset.** Users arrive with every kind of situation, habit and question.
   We don't design a path for each, and we don't leave anyone behind. We pick the few
   mindsets we want (the target mindsets) and build the screen so that everyone else is
   quietly converted into one of them. The user comes to think what we want them to think,
   look where we want them to look, and click what we want them to click, without being told
   to.

A screen that tries to serve every mindset serves nobody. A screen that converts every
mindset into the right one serves everybody.

## Rule 1. Pick the one job before drawing anything

For every screen, write down three things before building it:

- **Who** is on it (candidate, HR, hiring manager, interviewer) and what they arrived to do.
- **The one thing** they should understand in the first two seconds.
- **The one action** we want next.

Everything on the screen either serves those three or goes. If a screen has two jobs, it
becomes two screens, two tabs, or one job plus a link.

## Rule 2. Convert mindsets, deliberately and silently

- **Name the target mindset for the screen** (Rule 6), then list the other mindsets users
  arrive with. For each one, decide what on the screen turns it into the target. For
  example, an HR person who wants to skim every candidate's history is turned, by the order
  of the page, into one who asks "who needs me now?" first.
- **Convert through the screen, not through words.** Order, emphasis, defaults and what is
  one click away do the converting. No banners telling people how to work, and no tutorials
  that argue.
- **Build only the target path well.** It gets the space, the emphasis and the obvious next
  step. Other habits still work, but from a menu item, a "More" link or a setting, never
  from equal space. Each time someone takes the target path, that path is what they learn.
- **Don't announce the steering.** No "Advanced options you probably don't need". The
  other path simply lives one level deeper, and the target path is the easier one.
- **Defaults decide for most people.** A good default is a decision we made so the user
  doesn't have to. Show the choice only to those who look for it, for example a round
  setting that is off by default and explained only when turned on.
- **Fewer options beat explained options.** If an option needs a paragraph to explain, ask
  whether it should exist at all, or whether it belongs one level deeper.
- **Ask one question at a time.** Steps such as confirm requirements, then approve the plan,
  then rate, beat one form with every field.

## Rule 3. Order follows the eye

People scan before they read.

- **Text-heavy lists and tables** are read in an F shape: across the top, down the left
  edge, then across again where something catches. So the first words on the left of each
  row carry the meaning: the name, the status, the verdict. Never put the key fact at the
  end of a line.
- **Sparse screens and cards** are read in a Z shape: top left, top right, down across,
  bottom right. So the title sits top left, status or context top right, and the main action
  bottom right, where the eye ends.
- **One focal point per view.** The largest, highest-contrast thing is what is looked at
  first. Make it the thing from Rule 1. Only one element is filled, coloured or large at a
  time (`rules/material.md` Rule 1).
- **Read order equals importance order.** Top to bottom, left to right: what it is, how it
  stands, what to do. Supporting detail comes after the action or behind a disclosure.
- **Numbers and statuses line up** in the same column, so the eye compares down, not across.
- **The reason sits on the action.** The eye lands on the loudest element first and asks "why?" there. Put the answer touching it, as a joined control that also opens the evidence ("Avg score 88" beside "Send offer letter"), never across the row or in a line at the top. The person must feel they reasoned it, without having to look for the reason (`learn.md`, 2026-10-20).

## Rule 4. Make the next step obvious

- The action we want sits where the eye lands after reading the decision it depends on.
  That is right after the verdicts, not in a toolbar at the top.
- The forward action is the loudest. The way back, or the alternative, is quieter and comes
  first.
- After an action, say what happened and what comes next, in place: "Moved to Round 3.
  Schedule it under In progress." The user should never have to wonder "did it work, and
  now what?"
- An empty state is a next step, not a sad picture. It tells the user the one thing that
  fills the screen ("Add the resumes you have").

## Rule 5. Show less, then more

- **Summary first, detail on demand.** Verdict chips on the row, and the evidence in the
  dialog. A score on the card, and the transcript behind "Listen".
- **Hide by default what only some people need**, using `Expand`, `Collapsible`, a tab or a
  dialog. Never hide what everyone needs to decide.
- **Don't show what can't be acted on.** A disabled button with no reason, or a number
  nobody can change, is noise. Remove it, or say why it's there.

## Rule 6. Each user's frame

Each surface has one target mindset. Whatever frame a user arrives in, the screen turns
them toward this one. "Convert from" lists the common starting points.

| User | Convert from | Into (they think) | So they do | Kept one level deeper |
|---|---|---|---|---|
| **HR** | "Let me read everything", "let me tidy the pipeline", "I'll check later" | "What needs me right now?" | Decide or unblock the next candidate | History, settings, analytics |
| **Hiring manager** | "I'll look when I have time", "show me all the data", "HR handles this" | "Who is good, and do I agree?" | Give a verdict, approve, decide | Pipeline mechanics, credits, configuration |
| **Interviewer** | "I'll wing it", "let me see what others thought" | "What do I check, and what did I see?" | Ask the questions, give their own verdict | Other rounds' scores, other verdicts until theirs is in |
| **Candidate** | "Am I being judged right now?", "is this a trick?", "I'll do it later" | "What happens next, and I am ready" | Join, answer, finish | Internal states, scores, other candidates |

## Rule 7. Converting is not deceiving

We convert by making the right way the easiest and clearest one. We never trick. These are never allowed:

- Hiding a cost, a consequence, or a way to say no (for example the recording notice, or a
  rejection's reason).
- Pre-ticked consent, guilt-worded "No thanks" buttons, or fake urgency.
- Making the destructive or paid option look like the safe default.

If a user would feel misled once they found the thing we placed deeper, it was placed wrong.

## Small moves that do the converting

Conversion is rarely one big decision. It is these small moves, repeated on every screen.

1. **Prefill what we can guess.** If only one job and one resume fit, fill them in and show
   one sentence with "Change". Read the title from the JD's first line. Every field we fill
   is a decision the user no longer has to make.
2. **The default is our answer.** Most people never change it. Pick the default most people
   should end up with ("Everything" as the interview focus, auto rules off until turned on).
3. **First is what matters.** The first thing on the screen, and the first words on the left
   of a row, are what the user learns to care about. Verdicts before history, the score
   before the transcript.
4. **One loud thing.** One filled button, one large number, one coloured element per view.
   The eye goes there, and the habit forms there.
5. **The next step sits where the eye ends.** Right after the decision it depends on, or
   bottom right. Never in a toolbar at the top. The way back is quieter and comes first.
6. **Labels that steer.** A button names its result ("Move to Round 2"). A disabled button
   says what is missing ("Add a description to create"), so the label itself is the guide.
7. **Help at the stall, then gone.** Put help inside the thing the user is looking at when
   they hesitate, show it only when it applies, and fold it away on the first keystroke
   (`learn.md`).
8. **Point at the next field.** A quiet marker on the one field to fill next (as on New
   opening) beats a list of instructions.
9. **Say what happened, in place.** "Moved to Round 3. Schedule it under In progress." With
   Undo where it is safe, so trying the target path costs nothing.
10. **Empty means "do this".** An empty state names the one action that fills it ("Add the
    resumes you have").
11. **Other habits live one level deeper.** History, settings and analytics stay reachable
    from a tab, a menu or "More", never with equal space and never announced as "advanced".
12. **Remove what can't be acted on.** A number nobody can change, or a disabled control
    with no reason, teaches the user to ignore the screen.
13. **One question at a time.** Steps beat one long form. Each finished step is a small
    commitment that makes the next one easier.
14. **Same thing, same look, same words.** When a status or action looks and reads the
    same everywhere, the user learns it once and stops reading it.
15. **Make the right way the fast way.** The target path needs the fewest clicks. If the
    habit we want to replace is quicker, the screen will lose.

## How we steer: one behaviour per screen, made the easy click

Pick the one behaviour the screen exists for, then arrange everything so that click is the
path of least effort. The user should feel they decided. Worked example: "Check the
requirements" after Create, which almost always ends in Approve.

1. **We answer, they confirm.** Fill in the answer before asking: the must-haves already
   read, the top candidates already picked. Agreeing is one click; changing our answer is
   work.
2. **The only thing on screen.** At the moment of the decision, a dialog or a single card.
   Nothing else competes for the eye.
3. **The eye is led to the button.** Motion, order and weight end where the action is. The
   requirements dialog draws the round path from the first round to the offer, so the eye
   finishes on the offer, and Approve sits right under it.
4. **The wanted button is bigger and filled.** 60/40 at least, the wanted one last and
   filled, the other outlined. Never two filled.
5. **The other way costs a step.** "Fix it" opens an editor; Approve just closes. Leaving
   someone out is a small ×; adding someone means going to the table.
6. **Frame it as the responsible thing.** "Check them before the first resume is scored"
   makes approving feel like doing the job properly.
7. **The unwanted choice never looks like a choice.** A low score's Shortlist is outlined,
   not filled. Weak candidates are not in the ready list at all; they stay in the table.
8. **No exit that is not the action.** No "Not now" or "Later" on the card. Ignoring it
   means it is still there next visit.
9. **Words that sound already decided.** "Ayush is ready for the AI phone screen", not
   "Move to round". The user lets it through rather than deciding it.
10. **Hold back the doubt.** The evidence that supports the click is on the card; the full
    resume, breakdowns and caveats are one click deeper.
11. **Momentum.** After the click, say what happened and put the next small action in
    place, so one click leads into the next.

The line is Rule 7. Pressure through defaults, size, order and effort is allowed.
Deception is not: a cost, a consequence or a way out is never hidden, only placed one level
deeper. If the user would feel tricked on finding it, it was too far.

## Checklist before shipping a screen

1. Can I name the user, the one thing to understand, and the one action?
2. Is that action where the eye lands last (bottom right, or right after the decision)?
3. Is there exactly one focal point, and is it the thing that matters?
4. Do the left-most words of each row carry the meaning?
5. Which mindsets do users arrive with, and what on the screen converts each into the
   target? Does every other habit still have a quiet way in?
6. Are the defaults the decision most people would make?
7. Does every action say what happened and what comes next?
8. Would anyone feel tricked by what is placed deeper?
9. When the user is choosing, does the screen do the comparing for them (colour, order, position by the name) before any text? Does every number match the same number elsewhere? (`learn.md`, 2026-10-20)
10. Did I look at the real screen with real data and say, in one sentence, what the eye lands on first?
11. Uncover only the loudest element and a thumb around it: does that alone answer "why click this?"
12. Count the actions from arriving to done. Is the finishing button on screen the whole time, with no scroll, on a short laptop screen with real content? (`learn.md`, 2026-10-20)

## Card layout is a function, not a placement

Cards on a page go through `CardGrid` (`components/ui/card-grid.tsx`), which applies `cardLayout` (`lib/card-layout.ts`):
- Two per row, 50/50.
- With an odd count, the first (highest priority) takes the full row: 3 cards is one long, then two halves; 4 is two rows of halves.

A page only lists its cards, in priority order. Never wrap several cards in one grid cell, and never set widths by hand. A new kind of card is a new entry in the list, so the rule holds without anyone remembering it. Tests: `tests/card-layout.test.ts`.
