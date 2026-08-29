# Plan — the products

Step one of two. This document covers **structure only**: where the products
live, what they are called, and how they are wired. The content rewrite is step
two and is deliberately not in here — but see [What this forces](#what-this-forces-about-the-content)
for the decisions that cannot be deferred past step one.

---

## Where things stand

Four products exist. Three of them are `<article>` blocks inside one page.

| Product | Buyer | Today |
| --- | --- | --- |
| **Career OS** | The candidate | `<article id="career-os">` in `/collaborations` |
| **Training OS** | The student | `<article id="training-os">` in `/collaborations` |
| **Placement OS** | The university | `<article id="placement-os">` in `/collaborations` |
| **Hiring OS** | **HR** | **Nothing.** It is used as the umbrella brand name |

`/collaborations` is a 210-line page whose `<h2>` reads *"Hiring OS: one
platform, three products"*. That sentence is wrong in two ways at once: there
are four products, and Hiring OS is one of them rather than the container.

Three consequences, worth separating because they need different fixes:

1. **A product with a buyer has no page.** HR cannot be sold to, because there
   is nothing to send them.
2. **Three products are unlinkable.** `#career-os` is an anchor on a page about
   a partnership. Nobody lands on it from search, and it cannot be sent to a
   candidate on its own.
3. **They are filed under the partner, not the buyer.** A university evaluating
   Placement OS has to first care that Echobotics exists.

---

## The naming problem, first

Hiring OS cannot be both the suite and a product in it. Whatever else happens,
that word has to resolve. Three ways out:

- **A — Hiring OS is the HR product; the suite is unnamed.** Four peers, one
  per buyer. Cleanest. The suite is referred to as "the hiring products" and
  never as a brand.
- **B — Hiring OS is the HR product; the suite gets a new name.** Only worth it
  if the four are ever sold as one bundle to one payer.
- **C — Keep Hiring OS as the umbrella and name the HR product something else.**
  Contradicts what you told me the product is called. Listed for completeness.

**Recommendation: A.** It matches how you described them — four things, four
users — and a suite name nobody buys is a name that only has to be maintained.
Everything below assumes A; if you pick B, only the index page's title changes.

---

## The harder question: whose products are these?

This one is a business decision, not an information-architecture one, and it
changes the whole shape.

Right now these four sit under **Collaborations** — i.e. the site's claim is
*"Echobotics built a platform, we are the voice inside it."* Moving them into
the main product set changes that claim to *"these are ours to sell."*

- If **Voxio sells them**, they belong beside Calling/Avatar/Navigator, and
  Echobotics becomes an engineering credit.
- If **Echobotics sells them and Voxio powers them**, then lifting them out is
  a *case study* restructure, not a product one: four detailed proof pages,
  filed under Work, each ending in "we can do this for you" rather than "buy
  this."

**I have assumed the first**, because that is what "shift the products to the
main website" implies. It is the one assumption in this plan that would waste
the work if wrong, so it is worth one sentence from you before I build.

---

## Two product families, kept apart

This is the part I would push back on if it were done the obvious way.

The instinct is one **Products** menu with seven things in it. That conflates
two different axes:

- **Calling, Avatar, Navigator** are *surfaces* — where an agent runs. They are
  answers to "what can this technology do?"
- **Career, Training, Placement, Hiring** are *applications* — a named buyer
  with a named job. They are answers to "what do I get?"

Seven items on one menu makes the visitor sort them, and they cannot, because
the two groups are not comparable. A candidate does not want to know whether
they need Career OS or Website Navigation.

**So: one menu, two labelled groups.**

```
Products
├── Voxio agents          ← the technology
│   ├── Calling Agents
│   ├── 3D Avatar Agents
│   └── Website Navigation
│
└── Hiring products       ← built for a buyer
    ├── Career OS         · the candidate
    ├── Training OS       · the student
    ├── Placement OS      · the university
    └── Hiring OS         · HR
```

The buyer sits on the menu item itself. That single word is what lets someone
self-select in under a second, and it is the cheapest piece of business copy on
the whole site.

---

## Routes

```
/products                     index — both families, the map
/products/career-os           the candidate
/products/training-os         the student
/products/placement-os        the university
/products/hiring-os           HR                        ← net-new content
```

Notes on the choices:

- **`/products/<name>-os`, not `/career-os` at the root.** The root namespace
  already holds `/work`, `/about`, `/calling`. A product tier keeps them
  together and leaves room to grow without every new product competing with the
  company pages for a top-level word.
- **The three Voxio products stay at `/calling`, `/avatar`, `/webnav`.** They
  are established URLs with their own mini-sites; moving them is a separate
  piece of work with its own redirect surface, and it is not what this step is
  for. `/products` links to them; the index is the only place both families are
  shown together.
- **`/collaborations` survives**, shortened, as the Echobotics partnership
  story — how the two companies work together, not what the products do. The
  three `<article>` blocks leave; the partnership framing stays.
- **`#career-os` etc. must not 404.** Those anchors may be in decks and emails.
  A redirect from the old anchors to the new pages is part of the work, not a
  follow-up.

---

## One source of truth

The four products appear in at least five places: the nav flyout, `/products`,
the four pages themselves, the home page, and the contact form's "What are you
looking at?" select — which today lists three Voxio surfaces and none of these.

Copying a product name into five files is five chances to drift, which is
exactly the bug we just spent a session fixing with the hero backdrop. So:

**`src/lib/products.ts`** — id, name, buyer, route, icon, one-line pitch, the
feature chips. Nav, index, contact select and home cards all read from it.
Adding a fifth product becomes one entry, not a hunt.

---

## Page template

All four pages share one shape, so they can be compared — which is the point of
having four:

1. **Who it is for** — stated in the first line, not inferred
2. **The situation today** — the status quo it replaces, concretely
3. **What it does** — the mechanism
4. **The principle** — the opinionated bit (see below)
5. **Chips** — the four capability tags each product already has
6. **CTA** — same one, phrased for that buyer

Point 4 matters more than it looks. The existing copy already carries three
genuinely strong principles, and they are the most sellable thing in it:

- *Evidence over wording* — it refuses to help someone claim what they do not
  have (Career)
- *Two scores, never blended* — fit and conveyance, because one number hides
  the thing the candidate needs (Career)
- *Human-conferred readiness* — the machine never has the final word about a
  person; default is not-ready (Placement)

None of these survive as an anchor buried on a partnership page. Each is a page
opener.

---

## Sequence

**Phase 0 — decide.** The two open questions above: whose products, and the
Hiring OS naming. Everything else is mechanical.

**Phase 1 — structure, content moved verbatim.**
`products.ts`; the five routes; nav flyout in two groups; the three `<article>`
blocks moved across word for word; `/collaborations` trimmed to the partnership;
old anchors redirected. Hiring OS ships as a stub that says what it is for and
links to contact — an honest empty room beats a fake one, and it makes the gap
visible instead of pretending.

Nothing reads differently after this phase. That is intentional: it means any
copy problem found in Phase 2 is a copy problem, not a migration artifact.

**Phase 2 — content, business-first.** Separate document. Buyer language,
Hiring OS written from scratch, the principles promoted to openers, and a
consistent CTA per buyer.

---

## What this forces about the content

Three things cannot wait for Phase 2, because Phase 1 has to put *something*
in them:

- **Hiring OS needs a one-line pitch and a buyer statement** to exist on the
  menu at all. Two sentences, not a page.
- **The contact form's select** currently offers three Voxio surfaces. It needs
  the four products, or every enquiry about them arrives mislabelled.
- **Placement OS is currently addressed to "the educator & placement officer".**
  You said the university. Those are not the same buyer — one is a user, the
  other is who signs. Worth settling now, because it decides whether that page
  argues about workload or about placement rates.

---

## What I need from you

1. Whose products are these — Voxio's to sell, or Echobotics' that we power?
2. Hiring OS naming: option A, B or C?
3. Hiring OS in one line — what does it do for HR? It is the one product with
   no existing copy to work from.
