# Animation rules

Read this before adding, changing or removing any motion: transitions, keyframes, toasts,
loaders, panels, dialogs. It applies to the recruiter, candidate and institution surfaces
alike.

## The one question

Before any animation, answer: **what does this motion tell the user, and is that worth
their time?**

An animation may do only four jobs:

| Job | It tells the user | Example here |
|---|---|---|
| Map | where a thing lives and where it went | side panel sliding from the right edge |
| Feedback | that their action worked | the item flashing before a menu closes, a "Saved" tick |
| Perceived speed | that the wait is shorter than it is | skeletons, progress during an upload |
| Personality | what kind of product this is | kept small: this is a work tool |

If it does none of these, remove it. If it tells the user something false (wrong
direction, wrong origin), it is worse than no animation at all.

## Rule 1. Keep space consistent

- A thing leaves the way it came. A panel that slides in from the right slides out to the
  right. A dialog that grows from a button shrinks back toward it.
- The motion starts at the control that caused it. A popover grows from its trigger, a
  toast from its corner, a chat message from the composer.
- One kind of thing always moves the same way across the whole app. Two panels of the same
  kind must not enter from different sides.
- Panels the user can show or hide get an animation, so they learn the panel exists and
  where it went. This applies even when it opens on its own.

## Rule 2. Copy nature: things speed up and slow down

- Never use `linear` for anything that moves position or size. Linear is only for
  continuous loops (spinners, marquees, rotating borders).
- Real objects have weight. Prefer translate and scale together with opacity over a bare
  opacity fade when the thing has an origin.

## Rule 3. Then don't copy nature where it costs time

This rule overrides Rules 1 and 2.

- **Don't animate what the user started on purpose and does often.** Keyboard shortcuts,
  tab switches, list filters, sorting, opening a row, sending a chat line, toggling mic or
  camera: all instant.
- **Frequency sets the budget.**

  | How often | Budget |
  |---|---|
  | Many times a minute | 0ms |
  | Many times a day | 0 to 150ms, exit only |
  | Now and then | up to 250ms |
  | Once, or first time | up to 400ms |

  Marketing and landing pages may go longer (the `.reveal` 700ms). Inside the signed-in app, never.
- **Enter instantly, exit with a short confirmation.** For menus and pickers: no motion
  on open, a brief highlight on the chosen item, then a fast fade out.
- **Tooltips:** delay the first one, then show the rest at once while the user keeps
  hovering across controls. Use `components/ui/tooltip` and don't change its delays per
  screen.
- **Never block input on an animation.** The user can click the next thing while the last
  thing is still finishing.
- **Feedback survives every cut.** When motion is reduced or removed, keep the signal that
  something happened: a colour change, a tick, a toast. This is the Pokémon rule: the battle
  animations can be turned off, but the shake when you take damage stays.

## Rule 4. Speed is about how it feels, not how long it takes

- **Entering or leaving:** ease-out. Use `var(--ease-out-soft)`; Tailwind's `ease-out` is fine in class names.
- **Moving while already on screen** (reorder, resize, a split moving): ease-in-out.
- **Never ease-in** for anything the user is waiting on. It hesitates at the exact moment
  they are watching.
- **Bounce:** `var(--ease-spring)` only for small, rare moments of success. Never on
  navigation, panels, dialogs or lists.
- **Interruptible:** a panel being closed can be reopened mid-way and reverses from where it
  is. Prefer CSS transitions (which retarget) over keyframe animations (which restart) for
  anything the user can toggle.
- **Use motion to cover real waits, not to create them.** Start the transition at once
  while data loads behind it. Show the layout first (skeleton), then fill it in.
- **Add time on purpose only to build trust.** When an action is instant but important
  (submitting a verdict, moving a candidate on, spending credits, sending to a candidate), a
  short confirmation helps people believe it happened. Use this only for actions that change
  something for someone else, never for routine saves.

## Rule 5. Personality: restrained

This is a work tool. Our motion is closer to Linear than to Duolingo.

- No confetti, no celebratory bursts on hiring, rejection, payment or credit actions.
  Celebrating a decision about a person, or a spend, is the wrong tone and can steer
  behaviour.
- One brand moment is allowed per surface (the AI border, a first-run reveal). Not more.
- The candidate surface may be slightly warmer than the recruiter surface, but uses the same
  curves and tokens.

## Always

- **Tokens only.** Curves from `app/globals.css` (`--ease-out-soft`, `--ease-spring`).
  Durations from the scale `150 / 200 / 300ms` in the app. Don't invent new values per
  screen. A new keyframe goes in `app/globals.css`, never inline in a component.
- **Animate only `transform` and `opacity`** where possible. Avoid animating `width`,
  `height`, `top` or `left` except for the existing collapsible and details patterns.
- **Reduced motion.** Respect `prefers-reduced-motion`: drop movement, keep a short fade or
  an instant change, and keep all feedback (Rule 3). The existing `@media` block in
  `app/globals.css` is the pattern.
- **Both themes.** Motion that relies on a shadow or a glow must still read in dark mode.
- **Same meaning, same motion.** A toast, a dialog, a loading state and a success state move
  the same way everywhere they appear. Find the existing one before writing a new one.

## Checklist before shipping motion

1. Which of the four jobs does it do? If none, delete it.
2. How often will a user see it? Is it within the budget for that frequency?
3. Did the user start it on purpose (shortcut, tab, filter)? Then it should be instant.
4. Does it enter and leave from the same place as its cause?
5. Ease-out for entering, ease-in-out for moving, no ease-in, no linear except loops?
6. Can the user interrupt it, and click past it?
7. With reduced motion on, is the feedback still there?
8. Does it use existing tokens and keyframes only?

## Where things stand in this app

| Surface | Should be |
|---|---|
| Opening list, tabs, filters, row open | Instant |
| Chat send, mic and camera toggles, hand raise | Instant state change; a small fly-in for the new chat bubble is allowed (map: it came from the composer) |
| Meeting side panel, split handles, notes tab | Animated slide (map), interruptible |
| "Let them in", recording started, chat alert | Feedback: always shown, even with reduced motion |
| Verdict submitted, round decided, credits spent | Short confirmation (trust), no celebration |
| Uploads, AI analysis, resume parsing | Animated progress (covers a real wait) |
| Landing and marketing pages | `.reveal`, `.rise-in` and `.stagger` allowed; longer durations allowed |

Source: notes from a talk on animation principles (spatial consistency, Disney's slow in and
slow out, Emil Kowalski on easing and interruptibility). The reasoning is summarised here.
Don't copy the talk itself in.
