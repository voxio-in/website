# Material 3 rules: icons and buttons

Read this before adding or changing any button, icon button, button group or icon. It
covers how Material 3 (M3) thinks about them and how that maps onto this repo.

Material 3 has no official list of "seven rules". The seven below are distilled from its
button, icon button, icon and state guidance, chosen because they are the ones that decide
whether a screen reads clearly.

## What we have

- **Buttons:** `components/ui/button.tsx`. It has two variant sets, `buttonVariants` (the
  rounded rectangle) and `m3ButtonVariants` (the M3 pill that squares off on press, with a
  state layer and a ripple). `useUiStyle()` picks one. Never style a button by hand. Pick a
  `variant` and a `size`.
- **Grouped buttons:** `ButtonGroup`, `ToggleGroup`, `Toggle`, `ExpandingButton`.
- **Icons:** Material Symbols Outlined, weight 400, from `components/ui/icons.tsx`, imported
  by their old lucide names. Use `lucide-react` only when Material has no match. Never draw
  one.
- **Tooltips:** `components/ui/tooltip`.
- **Switches:** `components/ui/switch.tsx`, for a setting that takes effect at once. A checkbox is for
  picking items in a list or form.

## Rule 1. Emphasis follows importance

M3 has five button types, from loudest to quietest. Our variant for each:

| M3 type | Our `variant` | Use for |
|---|---|---|
| Filled | `default` | The one main action of the view: Submit, Save, Move to Round 2 |
| Filled tonal | `soft` or `secondary` | Important, not primary: Schedule, Copy all |
| Elevated | `elevated` | Only when it must lift off a busy or patterned background |
| Outlined | `outline` | Medium: alternatives next to a filled button, such as Cancel or Back |
| Text | `ghost`, or `link` inline | Low: in dialogs, cards and toolbars |

- **A main action that steps back keeps its shape and takes the `current` look.** When a filled
  button (Upload resumes) is not the job right now, it stays a rounded pill and becomes
  `variant="current"`: the sidebar's selected-item style, a dark fill with a thin brand border.
  Never a pale orange fill (`soft`) for this; the owner judged it washed out (2026-10-20). Corners
  stay rounded in both states; only the fill changes.
- **Not everything is a button.** Where a line has one way forward and fallbacks beside it, the
  fallbacks are underlined links (`variant="link"` with `underline`), in the same place, and the way
  forward stays the one button: "This round is the hiring manager's, and nobody is named yet. Add
  your hiring manager · [Let the AI run it]", with "Run it yourself" as a link on the line below. A change of emphasis is not a
  change of position: leave where things sit unless moving them was asked (owner, 2026-10-20).
- **One filled button per view, per region at most.** Two solid orange buttons side by side
  means nothing is primary. The second one becomes `soft` or `outline`.
- **The louder button is the one that moves the user forward,** not the risky one.
  Destructive actions use `destructive`, and are never the filled default in a pair.
- **In a pair, the main action goes last** (right, or bottom on mobile), and the quieter one
  goes first.

## Rule 2. Labels say what happens

- Use a verb and say the result: "Move to Round 2", "Give my verdict", "Copy all codes". Not
  "OK", "Yes", "Submit" alone, or "Click here".
- Sentence case, short (1 to 3 words where possible), no full stop, and per
  `docs/house-style.md`, no em dashes.
- The same action has the same label everywhere. If it says "Not a fit" on one screen, it
  never says "Reject" on another.
- A button that opens something ends with what it opens ("Recording and notes"). It doesn't
  say "Open" for everything.

## Rule 3. Icons add meaning, or they go

- **Inside a labelled button, an icon is optional and leads** (start side). Use it only when
  it speeds recognition (Copy, Download, Add). Never add one only as decoration, and never
  add one to every button in a row "for balance".
- **An icon after the label** means direction or a menu: `ArrowRight` for go forward,
  `ChevronDown` for a dropdown. Mark it `data-icon="inline-end"`.
- **One icon, one meaning,** across the app. If `Trash2` means delete, it never means clear
  or remove from list. Search for how the app already shows an idea before picking a glyph.
- **Outlined means off or idle, filled means on or selected.** For toggles (mic, camera,
  hand raised, bookmarked), switch to the filled glyph when it is active (a `fill-*` class
  picks it in `icons.tsx`). Don't show "on" through colour alone.
- **Sizes:** 18px in default and small buttons, 16px in extra small, 20px in large, 24px
  standalone. The button variants already set these. Pass `size-*` only when breaking that on
  purpose.
- **Icons take `currentColor`.** They follow the text colour of their button or line. Never
  give an icon its own hex or palette colour. Status colour comes from tokens
  (`text-success`, `text-destructive`, `text-warning`).

## Rule 4. Icon-only buttons need a name and a reason

- Use them only for actions so common the glyph is known: close, more, copy, mic, camera,
  settings, search. Anything else gets a text label.
- Every icon-only button has an `aria-label` and a `Tooltip` with the same words.
- M3 icon button styles map to: standard, our `ghost` with `size="icon"` (the default for
  toolbars); filled tonal, `soft`, when a selected state needs a container; filled,
  `default`, at most once a region.
- A toggle icon button (mute, camera) shows its state with the glyph (filled or outlined, or
  `Mic` versus `MicOff`) and with `aria-pressed`. Its tooltip describes the action, not the
  state: "Turn off camera".

## Rule 5. Every button shows its state the same way

M3 shows interaction with a state layer: a tint of the content colour over the container.

| State | Layer | Ours |
|---|---|---|
| Hover | 8% | `hover:after:opacity-[0.08]` in `m3ButtonVariants` |
| Focus | 10% plus a visible ring | `focus-visible:ring-3 ring-ring/50` |
| Pressed | 10%, plus ripple and shape morph | `active:` radius change and the ripple |
| Dragged | 16% | Only for draggable items |
| Disabled | 12% container, 38% content | `disabled:bg-foreground/12 text-foreground/38` |

- Don't add your own `hover:bg-*` on top of a variant. Extend the variant if it's missing.
- **Disabled must explain itself.** If a button is disabled for a reason the user can fix
  (evidence too short, code incomplete), say what is missing nearby or in its tooltip. A
  silent disabled button is a dead end.
- **Busy:** swap the leading icon for `Loader2` spinning and keep the label. The button keeps
  its width, so the layout doesn't jump. Disable it while busy so it can't be sent twice.

## Rule 6. Size and touch target

- **Minimum target 48 by 48px** on touch surfaces (candidate pages, the meeting room on a
  phone), even when the visible button is smaller. Pad the hit area, not the glyph.
- **Size by role, not by taste:** `lg` for the one main action of a page or form, `default`
  for most, `sm` in table rows and dense toolbars, `xs` only for chips and in-line meta
  actions.
- **Same row, same size.** Buttons side by side share one size and one height. Use
  `ButtonGroup` to join related ones.
- **Spacing:** at least 8px between separate buttons, so a miss doesn't hit the neighbour.

## Rule 7. Shape and grouping carry meaning

- **One shape language per mode.** M3 mode is pill, morphing toward square on press. Classic
  mode is the rounded rectangle. Never mix a hand-rounded `rounded-full` button into a
  classic screen, or the other way round. The variant decides the radius.
- **Pick the right group:**

  | Need | Use |
  |---|---|
  | Pick one of a few options, always visible (segmented) | `ToggleGroup` |
  | An on/off option | `Toggle` |
  | Related actions joined into one unit | `ButtonGroup` |
  | A main action with alternatives (split button) | `ButtonGroup` plus a dropdown trigger |
  | An action that expands to show its label on hover | `ExpandingButton` |

- **Segmented buttons** hold 2 to 5 options with short labels. More than that becomes a
  select.
- **A floating action button (FAB)** is the one main creative action of a screen, such as
  New opening. At most one per screen, and only where the screen is about creating things.
  This app does not use one today. Don't add one without a stated reason.

## Checklist before shipping a button or icon

1. Is there exactly one filled button in this region?
2. Does the label say the result, in sentence case, matching the same action elsewhere?
3. Does each icon add meaning, keep the same meaning it has elsewhere, and follow
   `currentColor`?
4. Do icon-only buttons have an `aria-label` and a matching tooltip?
5. Are toggles shown as filled versus outlined (or on versus off glyphs) plus `aria-pressed`?
6. Do disabled buttons say why? Do busy buttons spin and stay the same width?
7. Are targets 48px on touch surfaces, and do buttons in one row share a size?
8. Did you use a variant and size instead of hand-written classes?

## Where it applies in this app

| Place | Correct pattern |
|---|---|
| Verdict decision | "Not a fit" `secondary`, "Move to Round N" filled `default`, joined in a `ButtonGroup`, main action last |
| Meeting controls (mic, camera, hand, share) | Toggle icon buttons: glyph shows state, tooltip says the action, `aria-pressed` |
| Codes row ("Copy all") | One tonal button; individual copy actions are icon-only ghost buttons with tooltips |
| Table rows | `sm` ghost or outline; never filled |
| Dialog footers | Quiet first (`ghost` or `outline`), filled main action last |
| Chat send | One filled icon button, aligned to the input height |

Related: motion for buttons (press, ripple, shape morph) follows `rules/animations.md`.
