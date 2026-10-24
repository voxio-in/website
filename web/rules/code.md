# Code rules

Read this before writing or changing code in this repo. `CLAUDE.md` holds the summary. This
file has the detail, and the rest of `rules/` covers specific areas:

| File | Covers |
|---|---|
| `rules/db.md` | Data, Prisma, migrations, Redis |
| `rules/material.md` | Buttons and icons |
| `rules/animations.md` | Motion |

## Rule 1. Look before you build

1. **Search first.** For a component, look in `components/ui/` (primitives) and then
   `components/<domain>/`. For a helper, look in `lib/utils.ts`, `lib/<domain>/` and the
   domain's client helpers (such as `components/hiring/api.ts`).
2. **Extend the closest match.** Add a variant, a prop or an optional slot. Don't fork
   it. Two things that look the same and behave differently is the bug this rule prevents.
3. **The second copy becomes shared.** When the same markup or logic appears twice, lift it
   before writing a third. If you can't, say why in the handover.
4. **Place it where its users can see it:**

   | What | Where |
   |---|---|
   | Cross-domain UI | `components/ui/` |
   | Cross-domain logic | `lib/` |
   | Domain UI | `components/<domain>/` |
   | Domain logic | `lib/<domain>/` |

5. **A new page needs a reason.** Prefer a tab, a column, a row action, a dialog or a
   section on a page that already exists.

**Primitives that already exist (use them, don't hand-roll):**

| Kind | Components |
|---|---|
| Buttons | `button`, `button-group`, `expanding-button`, `toggle`, `toggle-group`, `copy-button` |
| Overlays | `dialog`, `sheet`, `drawer`, `popover`, `dropdown-menu`, `tooltip` |
| Forms | `input`, `textarea`, `select`, `simple-select`, `multi-select`, `checkbox`, `switch`, `date-picker`, `time-picker`, `field`, `password-input` |
| Status | `alert`, `badge`, `skeleton`, `progress`, `sonner` (toasts), `refusal-flash` |
| Layout | `card`, `tabs`, `table`, `table-actions`, `list-toolbar`, `scroll-area`, `split-handle`, `section-heading` |

## Rule 2. One file, one job

- **Data access:** `lib/<domain>/`.
- **HTTP:** the route (`app/api/.../route.ts`).
- **Rendering:** the component.
- **A route handler is thin.** It parses input, checks who is asking, calls one `lib`
  function, and maps the result or error to a response. No business logic and no Prisma
  queries inline beyond the trivial.
- **A component does not fetch with business rules.** It calls the route and renders what
  comes back.
- **Size limit:** split a function past about one screen, or a file that does two things.
  Extract a helper and give it a name that says what it does.
- **Business rules live once.** Prices, limits, windows and statuses are named constants
  in `lib/<domain>/`, exported and imported by both server and client
  (`VERDICT_WINDOW_DAYS`, `MEETING_RETENTION_DAYS`). Never a magic number at a call site.

## Rule 3. Writing the code

- **TypeScript strict.** No `any`, no `@ts-ignore`. Use `unknown` and narrow it. Types come
  from the source (Prisma types, `as const` lists), not from copies written by hand.
- **Names say what a thing is.** `verdictsOpen`, `takeSeat`, `meetingByToken`. No `data2`,
  `handleStuff`, `utils2.ts`.
- **Early returns** over nested `if`s. One level of ternary in JSX at most; past that, use a
  small function or a lookup object.
- **No dead code.** No commented-out blocks, unused exports, or `console.log` left behind.
  Server logs use `console.error("[area] what", detail)` with a prefix.
- **Match the file you're in:** its naming, comment density, quote style and line endings
  (many files are CRLF; keep them that way).
- **Additive changes.** Don't rename, reformat or "clean up" code you only opened to add
  something. Existing exports, props and routes keep working unless removing them is the
  task. Spot something worth fixing? Mention it, and leave it alone.

## Rule 4. Comments

- One or two lines, written by an engineer for an engineer, naming the constraint:
  `// Grid children are min-width:auto, which defeats truncate.`
- Never narrate the diff, address the reader, or explain to a non-developer.
- The long "why" goes in `bl.md`. Point at it: `// bl.md §134.`
- A short JSDoc line on exported functions and components says what it is for.

## Rule 5. Errors carry their reason end to end

- **Server:** throw the domain error with a plain reason and a status, for example
  `new HiringError("Give your own verdict first.", 409)`. In the route, catch and map it
  with `hiringErrorResponse(error, "POST /api/...")`, which logs unknown errors and hides
  their internals.
- **Client:** read `error` from the response and show it. Use `hiringFetch` and
  `hiringAction`, which already do this. Never replace a stated reason with "Something went
  wrong".
- Error copy follows `docs/house-style.md`: it says what happened and what to do next.
- Don't swallow errors with an empty `catch`. If ignoring one is correct (a best-effort
  email), add a one-line comment saying so and log it.

## Rule 6. Security in every route

- **Who is asking:** decide from the session or a signed key, never from an id in the body.
- **Validate input** at the route. Check types, lengths, and allowed values against the
  exported `as const` list. Trim and cap strings.
- **Rate-limit** anything public or costly with `rateLimit` or `limitByIp` from
  `lib/rate-limit.ts`.
- **Secrets** come from `lib/env.ts` only. Never log or return them, and never put
  personal data in URLs.
- **Escape anything user-written** that goes into HTML email (an `escapeHtml` helper).
- **Never trust the client's clock or role.** The server sets timestamps and checks roles.

## Rule 7. React: components and effects

- **Server components by default.** Add `"use client"` only for state, effects or
  browser APIs, as low in the tree as possible.
- **Props:** small and explicit. Pass data in, emit events out (`onSubmit`, `onSeat`).
  Avoid boolean soup; if a component takes three flags, it probably wants a `variant`.
- **Every async view has four states:** loading, error, empty and loaded. Each uses the
  app's existing look (`Loader2` with "Loading", `Alert`, an empty-state line).
- **Effects:**
  - Only for syncing with something outside React (fetch, subscriptions, timers, DOM).
    Derived values are computed during render, not stored in state.
  - Always use a braced body. Never implicitly return a value from an effect: a returned
    Promise or other value crashed the meeting chat.
  - Clean up everything: abort fetches or ignore stale results with a `live` flag, close
    `EventSource` and sockets, clear timers.
  - Stable dependencies. Callbacks passed into long-lived effects (streams, sockets) go
    through a ref or `useCallback`. An unstable callback reopened the meeting's event stream
    every second.
- **No impure calls in render.** `Date.now()`, `Math.random()` and similar go in effects,
  event handlers or state initialisers (`react-hooks/purity`).
- **Keys** are stable ids, never array indexes for lists that change.
- **Storage:** `sessionStorage` and `localStorage` only for per-tab conveniences, inside
  `try/catch`. Never the source of truth.

## Rule 8. UI code follows the design rules

- **Colour:** tokens only (`bg-background`, `text-muted-foreground`, `text-destructive`,
  `bg-success`, `text-warning`). Never a hex or a palette class such as `text-gray-500`.
- **Type scale in the signed-in app:**

  | Job | Class |
  |---|---|
  | Page or dialog title | `text-3xl font-semibold tracking-tight` |
  | Card or panel title | `text-2xl` |
  | Body | `text-sm` |
  | Meta and chips | `text-xs` |

- **Icons** from `components/ui/icons.tsx`. Buttons and icons follow
  `rules/material.md`; motion follows `rules/animations.md`.
- **Shells** for chrome: `navbar`, `app-sidebar`, `site-header`, `public-page-shell`,
  `auth-shell`.
- **Check both light and dark themes, and phone width.**
- **Copy:** every visible word follows `docs/house-style.md` (plain, short, no em dashes, no
  "I", nothing that sounds like a chatbot). Run `npm run lint:copy`.

## Rule 9. Performance by default

- Don't block on work the user doesn't need yet. Use `Promise.all` for independent awaits.
- Never `await` a network call (email, LLM, storage) inside a database transaction or
  in front of the response it doesn't affect. Fire it, then catch and log its failure.
- Cache only with a TTL and an owner (see `rules/db.md` Rule 9). Every round trip to
  Redis costs about 260ms in this setup, so batch commands or use one per loop.
- Ship less to the browser: send `select`ed response shapes, load heavy components
  (players, PDF, charts) only where they're used.

## Rule 10. Check, then say what was checked

Run these before saying anything is done:

```
NODE_OPTIONS=--max-old-space-size=2000 npx tsc --noEmit -p .   # typecheck (~2 GB; check free RAM)
npx eslint <changed files>
npm run lint:copy                                              # 0 errors
npm test                                                       # tests/**/*.test.ts
```

- **Read the real exit status.** A crash is a finding, not a pass. Never report "ok" after
  a check died.
- **Known failures:** name them and say why. For example, errors that clear after
  `npm run prisma:generate`.
- **Say plainly what was not browser-checked.** Lint passing is not "it works".
- **Clean up:** delete temporary scripts in the same session and leave no background
  processes, unless a server was asked for.

## Rule 11. Every change is documented and handed over

- **`changes.md`:** a new entry, newest first, after the template block. The plain-words
  half first, then the technical half. Both say the same thing.
- **`product.md` and `bl.md`:** update them when the behaviour, money or reasoning changes.
- **Handover in the reply:**
  - **Where:** files by path.
  - **How to reach it:** the exact click path from a route.
  - **Why there:** the placement, and what it reuses.
  - **Status:** what was checked, what wasn't, and any command the user must run.

## Checklist before saying done

1. Did I search for and reuse what exists, and lift anything now used twice?
2. Is logic in `lib/`, HTTP in the route, rendering in the component?
3. Are rules defined once as named constants?
4. No `any`, no dead code, no inline magic numbers, no reformatting of untouched code?
5. Do errors keep their reason from the server to the screen?
6. Does every route check who is asking, validate input and rate-limit if public?
7. Do effects have braced bodies, cleanup and stable dependencies?
8. Tokens, type scale, icons, both themes, phone width, house-style copy?
9. Typecheck, eslint, `lint:copy` and tests run, with the real results reported?
10. Is `changes.md` updated (and `product.md` and `bl.md` if needed), and is the handover
    written?
