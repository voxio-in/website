# Ask Voxio — task list

Built one at a time. Each task: build → `tsc` + `vite build` → one paid test on It1 → fix at the root → tick.
Rule for every tool: the model picks from closed choices; the server builds, checks and holds the knowledge.

## Done (2026-11-02)
- [x] 1. Evidence rule in the prompt: every pattern needs a call link or quoted line
- [x] 2. flow_profile splits out calls where the caller never spoke (110 of 373 on It1)
- [x] 3. Every insight result states its period; prompt asks for "N of M calls, period"
- [x] 4. `create_flow` — new flow card from a description; Apply creates, Undo deletes; `language` sets listening too. Tested: dental clinic in Hindi, 2 steps / 11K
- [x] 5. `record_fields` — fields with fixed values added to the AI step + state. Tested: inquiry_type, call_outcome, interested_course. (Saving per call: see Blocked)
- [x] 7. Prompt fixes: guidance to get_step → edit_workflow system_prompt with evidence, simulate before/after. Tested
- [x] 8. Mixed flows: guidance to record_fields + Branch, or clone_flow per purpose
- [x] 9. `voice_compare` — recorded samples (free) as players in the chat; result offers the edit_settings changes. Tested
- [x] 10. `simulate` — up to 3 pretend callers against the flow's greeting + instructions (stand-in model), judge verdict per caller. Tested
- [x] 12. `compare_periods` — before/after a date. Free
- [x] 13. `clone_flow` — copy as a new flow card, with settings changes (e.g. language). Tested
- [x] Per-answer token use already shown on each answer ("done" summary)
- [x] Undo per applied card (already there)
- [x] "improve" tool group (call reading, simulate, record_fields), sent only when the question is about calls; voice_compare moved to library. Core is ~18 tools instead of ~28

- [x] 11. Knowledge gaps: `kb_gaps` (reader, grouped by topic, cached), `add_facts` (facts section in the AI instructions, replaced as a whole), `draft_kb_doc` (fill-in card → browser Save as PDF → Knowledge page), `attach_kb` (Look up knowledge step before the AI step + flow.kbs). Tested on It1; attach_kb tested on the workflow edit only (It1's account has no knowledge base)

- [x] 19. Attach files in Ask Voxio: PDF, images, Word (.docx); up to 3 × 10 MB; images/PDFs sent to the model, .docx converted to text (mammoth); files ride on their own message only, later turns keep the names. Tested: .docx → add_facts card, PNG read correctly
- [x] add_facts merges with existing facts (remove by text, replace flag, duplicates refused)

- [x] 6. Field widgets: engine reads extra.variables.<name>.value as agent.<name>; widgets breakdown, over_time, share, known, average, cross, table; create/edit_dashboard take `fields`; new `recorded_fields` tool; prompt no longer says decided values are unavailable. Tested on sample calls (in-memory)

- [x] History widgets: funnel, turn_known, time_known (from each field's first history entry); per-call "What it recorded" on the session replay; get_session returns recorded values
- [x] 14. `follow_ups` (by recorded value, or unfinished calls) and `lead_export` (CSV straight to the browser; numbers never reach the model)

## Next
- [ ] PDF attachments need OpenRouter credit ≥ $0.50 (402 in the test); retest after a top-up
- [ ] Deploy check: request body limit on the host (3 × 10 MB files as base64 ≈ 40 MB)
- [ ] 13b. `translate_flow`: clone_flow changes language/voice but not the prompt and greeting text
- [ ] 15. `latency_report`, `cost_report` per flow/provider
- [ ] 16b. Change timeline per flow (cards live in server memory for a day; needs a table)
- [ ] 18. `weekly_report`, `compliance_check`, assistant memory per flow


## Blocked (needs a decision or backend)
- [ ] End-to-end check: apply record_fields on a flow, make a call, confirm extra.variables arrives and the widgets fill (0 calls have it as of 2026-11-02)
- [ ] 17. Watch (daily profile + alerts) — needs a scheduler

## Fixes
- [x] Sarvam voices tagged female/male, so "Hindi female" finds Ritu, Priya, Neha, Pooja
- [x] Inactivity: backend reads `inactivity-type` (static|dynamic) and `message` (text|list); edit_settings now enforces exactly that (from dcs voice_/inactivity_config_.py)
- [x] edit_workflow card shows labels ("Greeting · What it says") instead of raw keys
- [x] Older sessions store turns as Python-style strings; all tools now read them (asTurn)
- [x] Older sessions have totalConnectedTime 0; insight tools fall back to end − start
- [x] `test:false` filter returned no calls (JSON-path NOT is NULL in SQL)
- [ ] "carry on as before" is ambiguous in workflow edits
- [ ] The model sometimes writes its closing text before the card exists ("the card above")

## Parked (need a connector or backend work)
- `send_after_call` — no SMS/WhatsApp provider connected
- `handoff` — no call-transfer step in the voice backend
- `voice_compare` with custom text — needs a TTS preview endpoint and costs credits
- `connect_webhook` to Sheets/CRM, `call_list`, `call_me` — outbound calling/connectors
