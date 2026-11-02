# Voxio product notes

## Testing: simulated callers

Ask Voxio's `simulate` has up to 3 pretend callers talk to the flow's prompt. A judge then gives pass/fail, with problems pointed to by line.

- **Limit:** it only tests the prompt and the text logic. A stand-in model plays the agent, not our real speech pipeline, so turn-taking, interruptions, speech recognition and voice problems are not tested.
- It also can't build callers from recorded calls, and it can't run automatically before a release. LiveKit does both.
- **Accurate wording:** "we have text simulation with a judge; we don't have pipeline-level or automated test suites."

---

# Competitors: what they're shipping and planning (researched 2026-11-02)

None of the three publish a formal roadmap. Sources: GitHub releases and open PRs, official changelogs, funding announcements. Open PRs and feature requests show direction, not commitments.

## LiveKit (infrastructure + parts kit, $100M Series C Jan 2026, $1B valuation)

**Shipped in 2026**
- Answering-machine detection (Agents 1.5.9, May), async tools with filler speech (1.6, June).
- Adaptive interruption on by default (Mar), audio turn detector; text detector to be removed in Agents 2.0 (no date).
- Background "decisions" model (1.8.9, Oct 24, feature-flagged): side model scores e.g. "caller wants a human" without delaying replies; their example triggers a human handoff.
- Observability: end-to-end latency per reply (1.8.7), OpenTelemetry overhaul (1.8.0), LLM span attributes, sticky LLM fallback (1.8.5), PII redaction (Aug).
- Agent Console (Apr), per-second billing (Aug), Connectors (Sep), per-turn priced agent simulations (Oct), C++/Unity SDKs, Portal for robotics (Jun).
- New models almost weekly through LiveKit Inference (GPT-Live, Gemini 3.8 Live, Grok Voice 3, Voxtral 3, Inworld, Claude Opus 5.5).

**Short term (open PRs / top requests)**
- Prebuilt SMS and HTTP tools; guardrails (conversation monitoring).
- VAD with streaming STT; custom interruption detectors; self-hosted adaptive interruption + Krisp noise suppression (top request).
- Server: SIP call-state broadcast, agent availability check, rate limiting.

**Long term (Series C)**
- Own compute, storage and network services; a global network built for voice.
- LiveKit Inference as the default single-bill model layer.
- "Voice, video and physical AI agents" — robots as a second bet.

**For us:** their telephony and observability gaps vs us close within months. They're moving down into infrastructure, not up into finished products.

## Vapi (developer platform, $50M Series B May 2026, ~$500M valuation, 1B+ calls)

**Shipped in 2026 (docs.vapi.ai/changelog)**
- **Composer**: an assistant that builds and edits agents in chat, with per-conversation approval modes (Sep 28) and can create and run simulations (Sep 14). Direct equivalent of Ask Voxio.
- **Simulations and evals**: tester callers with personas and suites, latency limits that fail a run (Oct 5), eval run history, Claude Haiku 5.5 as judge.
- **Traffic splitting** across published versions (canary + instant rollback) and version-filtered call logs (Oct 12).
- DTMF keypad input on GPT-Live calls (Oct 12); Squads (multi-assistant handoffs) with a refreshed builder.
- Transcriber auto-fallback (Apr), voice fallback, Bedrock fallback models; Monitoring GA (Apr).
- Visual Workflows builder **retired Aug 18, 2026** in favour of Squads.
- Models: GPT-6 Luna, Gemini 3.8 Flash, ElevenLabs v4 Turbo, gpt-transcribe, Soniox confidence filter; HIPAA transcribers.

**Stated next phase (Series B):** uptime guarantees, predictable latency under load, call-level monitoring, guardrails, escalation to human operators. Regional edge nodes reported by one less reliable source.

**For us:** they dropped the visual workflow builder — a point for our graph. Their Composer matches Ask Voxio's build/edit/simulate; it doesn't (that we found) do knowledge gaps or field analytics.

## Retell (finished-product platform, closest competitor; claims $100M milestone on site)

**Shipped in 2026 (retellai.com/changelog)**
- **Conductor**: copilot on every dashboard page. Investigates calls, builds metrics and adds them to dashboards, proposes config changes shown in place for accept/reject with undo, simulates scenarios without dialing, and **turns failed calls into tests and proposes fixes**. Attach files, calls, nodes. Free daily credits.
- **Conversation Memory**: per-contact running brief across calls and SMS; nodes can skip questions memory already answers.
- **Built-in CRM** with two-way Salesforce/HubSpot sync; returning callers resume where they left off.
- **Live call monitoring**: live transcript, scoring, auto-transfer/webhook/alert, listen, whisper, take over.
- **Custom dashboards** by any post-call analysis field; AI QA Analyst; alerts.
- **Retell Workflows**: before/after-call orchestration, integration library (Slack, Drive, Salesforce), tool store.
- Conversation Flow: per-node model/voice overrides, global nodes, equation transitions, flow API; CLI.
- Colloquial model, expressive mode, public voice-model benchmark; KB parsing improvements.
- Already had: call transfer, IVR navigation, appointment booking, batch campaigns, branded caller ID, verified numbers, PII redaction.

**Direction:** everything around the call (CRM, memory, workflows, monitoring) plus an AI that maintains the agent.

**For us:** Retell already has most of what we listed as "ahead of LiveKit": copilot (Conductor ≈ Ask Voxio, and it turns failed calls into tests, which we don't), caller memory/resume, field dashboards, campaigns, knowledge base, a flow builder — plus transfer, IVR, live takeover and CRM that we lack. What we still have that they don't (as far as found): our own avatar engine and role-play coaching, voice website navigation, the knowledge-gap loop with page citations, Hindi–English tuning, and field history (turn/time each value was learned, funnels).
