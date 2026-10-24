# Jokes

Read this before writing any joke, easter egg or playful line. Echobotics jokes about hiring
clichés. A joke here should land in one read, for a person and for a model alike.

## Without technicalities

### The rules

1. **Simple and literal.** Say a true, familiar thing plainly. If it needs a second read, it
   is too clever. No metaphors, no wordplay that needs decoding.
2. **One joke, not a list.** Pick the best one and ship it. A rotating list on a work screen
   means most of them are weaker than the first.
3. **Something everyone has seen.** Job ads asking freshers for 2 years' experience, "we'll
   get back to you", every resume saying "expert". Recognition is the laugh.
4. **Aim at the cliché, never the person.** Laugh at resumes, job ads and hiring habits.
   Never at the candidate, the student, HR or the manager using the screen.
5. **Short.** One sentence where possible. Two at most: the setup, then the turn.
6. **The joke carries the message.** Best is one line that is both the fact and the joke, so
   the humour is the way it is said, not an extra sentence after it. The fact must still be
   clear on a first read. On a product screen the joke can also sit in the blue handwritten
   note (`MarginNote`) beside the plain fact: the printed line informs, the hand jokes.
7. **Never on bad news.** No joke on a rejection, an error that lost work, money, or
   anything about a candidate's result.
8. **House style still applies.** No em dashes, no "I", plain words (`docs/house-style.md`).

### Good and bad

| Too clever, or tacked on | Simple, and it is the message |
| --- | --- |
| Only the resume checks RAG. On paper, everyone knows RAG. | Only the resume checks RAG, and on a resume everyone is an expert. |
| A long sentence with the fact and the joke run together | "Only the resume checks RAG." with a handwritten note beside it: "On a resume, everyone is an expert." |
| Resumes have been known to round up. | On paper, everyone knows Python. |
| A resume is a candidate's best day, written down. | Every resume says "team player". |
| Paper never forgets a skill. People sometimes do. | Job ad: "Freshers welcome. 2 years' experience required." |

The test: read it once, out loud. If anyone has to pause to work out why it is funny, rewrite it.

## With technicalities

- Jokes live only in the places listed under "Where the humour stays" in
  `docs/house-style.md`. Add the file there when you add a joke to a new place.
- Website lines with time and emoticons: `lib/human/greetings.ts`. Careers page jokes:
  `app/careers/page.tsx`. Shortlist lines: `components/candidate/shortlist-cheers.ts`
  (a list on purpose, shown once per event). Product warning: `RESUME_JOKE` in a `MarginNote` in
  `components/openings/unchecked-must-haves.tsx`. Sign-in and join screens: one handwritten line per screen on the right panel, under the description (`AuthQuote` in `components/auth-quote.tsx`, picked by `moment`); the AI interview join page uses `moment="interview"`; the company test page (`app/t/[token]`) uses `aptitude` or `technical`, and `-ended` after handing in, with the cat's `catNote="test"` line.
- `components/ui/margin-note.tsx` is the blue handwriting (`font-hand text-ink`). At most one
  per screen; never in errors, settings or tables.
- Emoticons such as `:D` and `¯\_(ツ)_/¯` are for the website only, never inside the
  signed-in app.
- No `Math.random()` in render to pick a joke (`react-hooks/purity`). On a product screen,
  use one fixed line.
- `npm run lint:copy` still runs on joke files; only the phrase check is skipped for website
  joke files.
