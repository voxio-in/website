# Voxio users: how they think

Written 2026-10-23 from web searches and `D:\vx\research` (`voxio-plan.md`, `2026-10-23_who-uses-voxio.md`).
Most sources are vendor blogs or small studies, so they give direction, not proof. Where no source speaks
to a role directly, the row is marked **Predicted** and reasoned from nearby research. Nothing here has
been tested with our own users yet. When the dashboard and these notes disagree, check with a real user.

Who we know so far: a 60-year-old Indian businessman in Singapore, the SFBC team in Japan, and some developers.

## The roles at a glance

| Role | Share of use | Arrives thinking | We turn them into | So they | One level deeper |
|---|---|---|---|---|---|
| **Programme owner** (educator, training lead, business owner) | Most | "Will this take my week?", "I'm not technical" | "I picked a template, tried it, and it works" | Start from a template, test, adjust a few words | Providers, knobs, workflow graph |
| **Results reviewer** (faculty, admissions or collections manager) | Often, briefly | "Did it go well? Can I trust it?" | "I can see what happened and why" | Read sessions and scores, replay a moment | Settings, build tabs |
| **Developer** | Few, once | "How much does it really cost, and is it fast?" | "The docs are true and the key works" | Copy a key, wire a webhook, leave | Everything else |
| **Reseller / agency** | Possible | "Can I sell this as mine and make money?" | "One client at a time, clean and separate" | Set up a client flow fast | Not built yet (sub-accounts) |
| **Approver** (ministry, hospital IT, compliance) | Rarely logs in | "Where is the data, and who sees it?" | "The answers are in writing" | Read the security and data page | Not in the dashboard |
| **Person in the session** (student, trainee, called parent) | Never in the dashboard | "Am I being judged? Is this a robot?" | "It's safe to practise / it told me it's AI" | Finish the session | Scores, internals |

---

## 1. Programme owner: the main user

The SFBC team and the Singapore businessman are here. They know their field deeply and the plumbing not at all.

| # | They think | What it means for us | Source |
|---|---|---|---|
| 1 | "I don't have time to build this." Time is the top barrier in simulation education (74% of programmes), ahead of staff (65%). | It must work from a template in minutes. Never ask for setup before showing something working. | Perfusion simulation survey 2025 (PMC) |
| 2 | "I don't know how to write prompts." Prompting is a named effort barrier for instructional designers. | They describe the scenario in plain words; we write the prompt. Raw prompt boxes go one level deeper. | IAFOR 2024 (n=144); JAID UTAUT study |
| 3 | "Writing a realistic case is hard." Instructors struggle to write domain-specific scenarios. | Offer a drafted scenario they edit, not a blank page. | Emerald, instructor-centred case generation |
| 4 | "I'll wait until someone I trust shows me." Older owners cite pace of change (31%), cost (30%) and complexity (29%), and wait for guidance. | A short guided first run. Show proof from named customers like theirs. | ICIC 2025 (n=3,752) |
| 5 | "I'm less sure with this than younger people." Owners over 65 are about half as familiar with AI as those 18–34 (20% vs 49%). | 18px type, plain words, no jargon ("STT", "VAD", "barge-in"), undo everywhere. | JPMorgan Chase Institute |
| 6 | Japan: "Is this vendor trustworthy for the long term?" Japanese firms value trust, compliance and long-term value over speed. | Careful, complete and calm. No half-built screens they can stumble into. Nothing mocked without saying so. | GMO Research 2025 |
| 7 | Japan: "I don't know what AI can do for us." 47.9% of SMEs not using AI don't know which work it could do. | Show examples of finished outcomes (a session, a score) before asking them to build. | Japan SME survey 2026 |
| 8 | **Predicted:** "If I break it, it's my fault." Older and non-native-English users blame themselves for errors. | Every failure says what happened and what to do, in place (`learn.md`). Never a raw error code. | Older workers' lower tech confidence (age-differences review) |
| 9 | **Predicted:** "Show my boss / my client." A programme owner has to defend the purchase. | A clean, shareable result page and a demo link. | From the buyer ≠ user pattern in the research |

## 2. Results reviewer

Faculty checking students, admissions or collections managers in India.

| # | They think | What it means for us | Source |
|---|---|---|---|
| 1 | "Did it say what it had to?" Collections QA checks disclosures, banned phrases, calling hours and promises to pay. | Each session shows pass or fail on the rules that matter, at the start of the row. | Exotel; Gistly; ituring (vendor) |
| 2 | "We only ever checked 2–5% of calls." Manual QA samples a small share. | Score every session; show the few that need a human first. | caller.digital (vendor) |
| 3 | "Prove it later." Audit trails of every score and override are expected. | Keep recordings, transcripts and who changed what. | Gistly (vendor prediction) |
| 4 | "Is the AI's score fair?" Students accept AI feedback but see it as a supplement. | The score always shows the moment behind it: a quote you can play. | Medical students' AI feedback study (PMC 2025) |
| 5 | **Predicted:** "Who needs me today?" Like HR in internal-shortlisting, reviewers come to find exceptions, not to browse. | Lead with sessions that failed or were flagged, not a full history. | ci `mindsets/hr.md` pattern |

## 3. Developer

| # | They think | What it means for us | Source |
|---|---|---|---|
| 1 | "What's the real cost per minute?" Headline rates hide LLM, STT, TTS and phone costs. | One all-in price per minute, shown before they build. | CloudTalk; Cekura; Venture Harbour |
| 2 | "Is it fast?" Vendors quote ~600 ms and testers see 500–900 ms. | Show measured latency per session, honestly (ours is 2.4 s today). | Retell; Venture Harbour |
| 3 | "Do the docs match the API?" | No snippet for a package that doesn't exist (known problem #2 in `docs/DASHBOARD.md`). | `docs/DASHBOARD.md` |
| 4 | "Can I test my webhook?" Webhooks and REST are how they connect. | A Send test button and a delivery log (`sendTestWebhook` exists but nothing calls it). | Venture Harbour; `docs/DASHBOARD.md` |
| 5 | **Predicted:** "I'm here for ten minutes." | Key, one snippet, one test, done. Developers stays a side page. | Developer-first platform pattern |

## 4. Reseller / agency (possible, ask the Singapore colleague)

| # | They think | What it means for us | Source |
|---|---|---|---|
| 1 | "Can I sell it under my brand?" Agencies need branded portals, sub-accounts and their own billing. | Not built. Decide whether to support it before promising it. | AInora; Retell partner page |
| 2 | "Support eats my margin." Support labour is the largest hidden cost; churn follows neglect after go-live. | Templates and copy-a-flow so every client isn't custom work. | Centricall; Ringlyn (vendor) |
| 3 | "What do I pay you, what do I charge?" Wholesale $0.08–0.24/min, resale $0.25–0.60. | A clear wholesale price. | Centricall; AgentCX (vendor) |

## 5. Approver (ministry, hospital, pharma)

They rarely log in, but they decide.

| # | They think | What it means for us | Source |
|---|---|---|---|
| 1 | "Where does the data live?" Data residency removes most vendors for Singapore buyers. | State the region per account. | TechDirectory SG |
| 2 | "Do you train on our data?" Many AI SaaS tools do by default. | Off by default, said in writing (already in `voxio-plan.md`). | Global Law Experts |
| 3 | "Does it meet IM8 / GCC?" These rules are still changing in 2026. | A security page kept current. | CloudPick; GovTech |

## 6. Person in the session (never sees the dashboard, shapes it anyway)

| # | They think | What it means for us | Source |
|---|---|---|---|
| 1 | Students: "Is it realistic?" 85% of positive comments mention realism, and they feel stuck when the patient can't answer. | Programme owners need a way to see where the character got stuck. | GP-training study (arXiv); AI-VSP study (ScienceDirect) |
| 2 | "A judgement-free place helps me ask." | Practice mode with no score shown to others. | AI-VSP study |
| 3 | Called people: "Tell me it's a robot." 81% want AI callers to say so; 73% don't trust AI to make calls correctly. | The opening line that discloses AI is a default, not an option. | ThirdEye Data (not India-specific) |
| 4 | India: Hinglish and parents. Code-switching is normal and parents are often on the call. | Language presets and a parent-aware admissions template. | caller.digital (vendor) |

---

## What this changes in the dashboard

1. **Home starts from templates and finished examples**, not an empty Flows table.
2. **Build tabs speak the field's language.** "How the patient talks", not "TTS provider". Providers and knobs go one level deeper.
3. **Sessions lead with exceptions and reasons**: what failed and the moment to replay.
4. **Developers and Integrations stay side pages**, and they must be true (no fake SDK, a working test webhook).
5. **No silent mocks.** "Saved" must mean saved (overlay bug), because trust is the whole sale for approvers and Japanese buyers.
6. **18px type, plain words, undo**, for older and non-native-English owners.

## Sources

- Perfusion simulation survey 2025: https://pmc.ncbi.nlm.nih.gov/articles/PMC13281300/
- AI in simulation-based medical education: https://www.dovepress.com/the-evolving-role-of-ai-in-simulation-based-medical-education-a-narrat-peer-reviewed-fulltext-article-AMEP
- GenAI virtual patients, systematic review 2026: https://www.sciencedirect.com/org/science/article/pii/S1438887126004553
- Digital Education Council 2026: https://www.digitaleducationcouncil.com/resource-library-items/ai-in-higher-education-global-survey-2026
- IAFOR instructional designers survey: https://papers.iafor.org/submission75073/
- JAID GenAI in instructional design: https://edtechbooks.org/jaid_14_3/ciglaqjrnb
- Instructor-centred case generation: https://www.emerald.com/jeet/article/6/1/17/1309957/Instructor-centered-case-generation-with-GenAI-a
- ICIC AI in business 2025: https://icic.org/wp-content/uploads/2025/02/ICIC_AI-In-Business_Report.pdf
- JPMorgan Chase Institute, AI adoption gap: https://www.jpmorganchase.com/institute/all-topics/business-growth-and-entrepreneurship/ai-adoption-gap-gender-generation-among-small-business-owners
- Age differences in workplace tech adoption: https://www.researchgate.net/publication/393151338_Age_differences_in_the_adoption_of_technology_at_work_a_review_and_recommendations_for_managerial_practice
- GMO Research, Japan gen-AI 2025: https://gmo-research.ai/en/resources/studies/2025-study-gen-AI-jp
- Japan SME AI survey 2026: https://japan.co.jp/e/reports/japan-small-business-ai-adoption-survey-2026.html
- Access Partnership, AI in Japan: https://accesspartnership.com/wp-content/uploads/2025/09/Bridging-the-AI-Gap_Final_EN.pdf
- Exotel RBI-compliant collections: https://exotel.com/blog/rbi-compliant-ai-collections/
- Gistly collections QA: https://www.gistly.ai/blog/ai-qa-fintech-collections-india
- ituring RBI AI collections: https://ituring.ai/ai-collections-calling-under-rbi-2025-consent-transparency-and-compliance/
- caller.digital QA scoring: https://caller.digital/blog/voice-ai-call-qa-scoring-100-percent-audit-india-2026
- caller.digital edtech playbook: https://www.caller.digital/blog/voice-ai-edtech-operator-playbook-india-2026
- CloudTalk Retell vs Vapi: https://www.cloudtalk.io/retell-ai-vs-vapi-ai/
- Venture Harbour, 7 voice tools: https://ventureharbour.com/voice-ai-platforms-compared-i-built-voice-agents-on-7-tools/
- Cekura voice APIs: https://www.cekura.ai/blogs/best-ai-voice-apis-for-developers
- AInora white-label comparison: https://ainora.lt/md/blog/best-white-label-ai-voice-agent-platforms-agencies-2026.md
- Centricall reseller guide: https://www.centricallai.com/article-and-insight/white-label-ai-voice-agents
- Ringlyn agency pricing: https://www.ringlyn.com/blog/white-label-ai-voice-agent-pricing-margins-2026/
- TechDirectory SG cloud guide: https://techdirectory.sg/guides/ai-cloud-computing-singapore
- CloudPick IM8 / GCC: https://docs.cloudpick.kr/en/singapore/government-cloud/
- Global Law Experts, AI vendor due diligence: https://globallawexperts.com/ai-legaltech-singapore/
- Medical students and AI feedback: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12671429/
- GP training agentic AI: https://arxiv.org/pdf/2512.18440
- AI-VSP validity: https://www.sciencedirect.com/science/article/pii/S1876139924000288
- ThirdEye conversational AI trust: https://thirdeyedata.ai/company-insights/state-of-conversational-ai-and-consumer-trust

---

## Flows list: what each role needs (2026-10-23)

The question every visitor brings to the list: **"Which agent do I open, and is it working?"**

| Role | Comes to | Needs in the row | Gets it from |
|---|---|---|---|
| Programme owner | Open one agent, or check it's ready | Name, what it is (avatar, phone, voice), whether it has been tried | Flow column, Status chip, **Test** action |
| Results reviewer | See which agents are in use | Real sessions (tests excluded), when the last one was | Sessions, Last session |
| Developer | Copy a key | The key | **Columns → API key** (one level deeper) |
| Admin | Look after other people's flows | Whose flow it is | The owner's name under the flow name |
| Reseller (later) | Find one client's flows | The client | A Client column, once clients exist |

**Status: one chip, with the reason on hover.**
- **Live** (green): a real session in the last 7 days.
- **Quiet**: real sessions, but none in the last 7 days. Hover: "Last real session 12 days ago".
- **Tested** (amber): only test sessions so far. Hover: "Tested 3 times. Connect a number or website to go live".
- **Not tried** (neutral): no sessions. Hover: "Try it in Test first".

**The default order is "Recently used".** The flow someone is working on is at the top, so "who needs me" comes before "everything I have".

**Row actions: the next step comes first and is labelled.** Not tried → **Try it**. Tested, not connected → **Connect**. Quiet → **Last session**. Live → **Test**. Duplicate and Delete follow as icons. Clicking a row opens the flow. Export and bulk delete live in the selection bar.

**Above the table: what needs you, as steps, not counts.** For example, "2 flows are tested but not connected. Connect a number or website". Each line filters the table, and nothing shows when there is nothing to do. No charts or totals: Home has them. No "failed calls" either: most sessions record no status, and phone durations were lost in the Mongo copy.

**Admins: "My flows | Everyone's", My flows by default.** Other people's flows are one click away, not mixed into their own work.

**Kept off the default row:** API key and Created (Columns menu). Error text shows only when there is an error.

---

## Flow overview: what each role needs (2026-10-25)

The question every visitor brings to one flow: **"Is this agent working, and what do I do now?"**

| Role | Comes to | Needs first | Gets it from |
|---|---|---|---|
| Programme owner | Check it's ready, then adjust it | Where it stands and the one next step | Status chip by the name; the **next-step card** (Try it, Connect, Last session, Test) |
| Results reviewer | See what happened | Real sessions, newest first, with what was said | Sessions table, tests hidden by default; **What was said** on each row |
| Developer | Copy the key | The key | Key chip under the name |
| Admin | Look after someone's flow | Whose it is | "Name's flow" in the meta line |
| Older or non-technical owner | Not break anything | Plain words, one obvious button | One filled button on the page; everything else quiet |

**The order down the page.** Name, status, owner and key; the next-step card; the build rows (Workflow, Connected to); Activity (the chart); Sessions.

**The next-step card is the only filled thing.** Its headline is the state ("Tested, not live yet") and its line is the reason ("Tested 3 times. Connect a number or website to go live."). The button is the same step the Flows list shows for that state, from `lib/dashboard/flowStatus.ts`. "Last session" opens the last real session in the list below.

**Real sessions by default, once there is one.** Tests are counted apart everywhere on the page; the table's **Show** filter brings them back. Before the first real session the tests are the only history, so they show and the filter is hidden. A just-run test (`?session=`) opens with tests shown.

**No false comfort.** A session that recorded no status shows "—", not "Completed". The status filter has **Not recorded** as its own choice.

**Activity is shown, not folded.** A page with sessions shows their chart (the owner asked for it). It charts real sessions once there is one, and the tests before that ("Tests so far"). Its numbers use the chart's own range, so one page never shows two counts. No channel split bar (the table filters by channel). Duplicate and Export are quiet buttons at the top right.


---

## Avatars: what each role needs (2026-10-25)

The question every visitor brings to Avatars: **"Which faces do I have, where is each one used, and can I add one?"**

| Role | Comes to | Needs | Gets it from |
|---|---|---|---|
| Programme owner | Add a patient's face; find which face is which | Faces grouped by the flow that uses them; one clear upload | Groups titled with the flow's name; **Add a face** |
| Older or non-technical owner | Check the face looks right; not break anything | See it move; a warning before deleting a face in use | Click a face to play it; delete asks and names the flows |
| Developer | The face ID | Copy it | ⋯ menu → Copy face ID |
| Admin | Look after other people's faces | Whose face it is | "Mine \| Everyone's", Mine by default; the owner's name on the card |

**First visit: the upload is the page.** With no faces, the drop zone and the tips fill the screen.

**After that: faces first.** **Add a face** is the filled button in the header and opens the upload in place. Faces are grouped by the flow that uses them (looks and smooth changes both count), titled with the flow's name and linking to its Avatar tab; faces no flow uses come last, as "Not used yet". A search appears past eight faces.

**Each card:** the face (click to play it bigger), its name, and "Used by" with each flow. Delete and Copy face ID are in a ⋯ menu.

**Deleting is safe.** A face no flow uses is deleted with Undo. A face in use asks first and names the flows; the server refuses it too unless the person confirmed.

**One upload, shared with the Avatar tab.** Several files at once, each named after its file, uploaded one at a time with its own status. "When to use it" appears only on a flow. Face tracking is under More options, Standard by default. Leaving during an upload asks first.

---

## Behaviour: what each role needs (2026-10-25)

The question every visitor brings: **"It cuts me off / it's slow / it nags. What do I change?"**

| Role | Comes to | Needs | Gets it from |
|---|---|---|---|
| Programme owner | Fix how a call feels | Sections named after what they heard; one choice per section | "How fast it answers" with Waits for you · Answers quickly · Starts before you finish |
| Older or non-technical owner | Not break it | Plain words, seconds not milliseconds, no settings that do nothing | Seconds for the nudge; a setting that does nothing says why |
| Developer | Exact values; the JSON | Every number | Fine-tune; ⋯ → Copy settings as JSON |

**Three sections, by what the caller notices:** How fast it answers; When you talk over it; When the caller goes quiet.

**One choice for pace.** Each option sets the engine, warm-up, first words and reply early together, with one sentence saying what you'll hear. The exact settings are under **Fine-tune**, open when they were set by hand.

**Only true settings.** A setting the voice server doesn't read isn't shown (the old "caller's pause before replying"). A setting that only works with the faster engine (reply early, its window, hold the floor) says "Works only when it listens to how you speak" instead of a control that does nothing. The nudge is in seconds, because the voice server counts seconds.

**Next step:** Try it in Test, in the header.

---

## Workflow editor: what each role needs (2026-10-25)

The question most visitors bring: **"Where are the words, and how do I change them safely?"** Only developers come for the graph.

What real flows look like: OSCE cases have ~14 steps with one long patient prompt, a feedback prompt and a few fixed lines; templates have 2–5 steps in a loop. The words matter far more than the shape.

| Role | Comes to | Needs | Gets it from |
|---|---|---|---|
| Programme owner | Make Margaret sound more worried; change the opening line; soften the feedback | Every line and instruction, in conversation order, in a big editor | **Script** (the default view) |
| Older or non-technical owner | Change a word without breaking anything | Never needing the boxes for a word change; plain messages; Undo | Script; checks in plain words |
| Developer | Wire branches, pass values, pick models | The graph, step types, variables, the code | **Flow**, one tab away; ⋯ → View as code |
| Reseller (later) | Copy for a client and change names | Templates, find and replace | ⋯ → Start from a template |

**Script, by default.** It follows the arrows from the first step and shows what the agent says and is told: fixed lines ("Says"), each AI step's instructions ("Told"), filler phrases, and where it waits for the caller or decides between paths, as quiet lines. Each item edits the same workflow as the canvas, with the same Undo and Save, and has "Show in Flow". Steps nothing leads to are listed last. An empty workflow opens on Flow.

**The bar:** Script | Flow on the left; Undo, Redo, the checks, Test and Save on the right. Tidy up, line style, grid, templates, import, export and the code view are in a ⋯ menu. Starting from a template asks first when the canvas has steps.

**Checks say what's wrong and what to do**, using the editor's own names (Listen, AI reply), never "system prompt", "node" or "variable".

**Type:** card names 18px, summaries, paths, chips and the palette 16px. The canvas first fits the opening steps at a readable size, not every step tiny.

**Adding steps is by conversation move, not by engine part.** The list is "Add to the conversation": Greeting, Ask a question, AI conversation, AI decides when to end, Goodbye and hang up, One moment… Each adds its steps already named and connected, the way the templates are built. Single steps (Say, Listen, AI answers, AI thinks, Branch, Filler) are one level deeper, under "Single steps".

**"Add next step" suggests what usually comes next first**: after Say, Listen; after Listen, an AI conversation; after an AI that answers, a line back to the Listen before it; on a branch path, Goodbye or back to Listen. Every branch path has its own "Add next step".

**Names say what you'll hear:** "AI answers (out loud)" and "AI thinks (silent)". An AI that thinks silently is never added alone: the Say that speaks its reply comes with it. "Hang up after saying this" is on Say's main settings, and the card says "Hangs up".

**An empty canvas starts in one click:** "Start with a greeting" (a greeting, then an AI that answers and listens again), or a template.

**Each step's settings lead with what decides the step.** Main settings, then Developer settings. Each setting's one-line help is in view under it, not only behind an (i). Settings that don't apply right now are not shown (speaker labels without tidying, "Give up after" when no other AI races it), and one that needs another voice says so (emotion without ElevenLabs).
- **Say:** "These words | What the AI decided" first. Fixed lines are finished, not cut off (as in every template).
- **Listen:** nothing to set; it says so and points to Behaviour for silence.
- **AI thinks:** "It decides: What to say next · Whether the call is over" as switches. **AI answers:** "Can end the call". Memory is a choice of the memories in the workflow, never typed. An empty instructions box offers examples.
- **Branch:** yes/no answers first; a yes/no gets fixed Yes, No and Otherwise. Text paths say they match the exact word. Otherwise is listed. Removing a connected path says its line went too.
