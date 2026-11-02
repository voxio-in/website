# Live takeover spec: whisper, hold, resume

**Status:** built in the backend (voicebot, plus the agent's hook), tested offline with fakes; not yet run on a live call.
**Date:** 2026-11-02
**Scope now:** browser and avatar calls (voicebot). Phone calls (callbot) come later.

A supervisor listening to a live call can guide the agent (whisper), speak through it, or take the
call over (hold) and hand it back (resume). Everything happens in voicebot, in the process that holds
the call. The agent stays an isolated entity: it never learns that a hold happened. It only gets
supervisor guidance as an input with a turn, and a hold setting.

## 0. Access

- The SDK's backend sends the flow's API key (`flow_api_key` header) and `{"session_id"}` to
  `POST /v1/tokens/supervisor` (voicebot). It checks that the call is live on this server, was opened
  with that same key, and has no supervisor yet.
- It returns a short-lived, single-use `vt_` token (stored apart from caller tokens, so it can never open
  a new call) and the ICE servers.
- The supervisor's browser opens its own connection with `POST /rtc/offer/supervisor` (`token` header): an
  audio track (their microphone) and a data channel. They hear the caller and the agent mixed.
- **Every command goes over that data channel,** so a long hold doesn't outlive the token. Each is answered
  `{"type": "ack", "id", "ok", ...}`.
- **One supervisor per call.** A second token request or offer gets 409 until the first disconnects.

## 1. Whisper

```json
{ "type": "whisper", "id": "c1", "text": "They sound annoyed, slow down. <Adopt>Always offer the sibling discount</Adopt>" }
```

| Written as | What happens | Lifetime |
|---|---|---|
| plain text | sent with the next agent turn | used up once a kept turn's LLM step read it |
| `<Say this>…</>` | skips the LLM, spoken in the agent's voice (and avatar) | removed once spoken |
| `<Adopt>…</>` | sent with every agent turn | stays for the rest of the call |

- One message may mix flags; it is split into parts. Limits: 2,000 characters per whisper, 10 Adopts per call.
- **Joined, not replaced.** Several whispers before the next turn are joined in the order they arrived.
- **Mid-turn.** A whisper that arrives while a turn is running waits for the next turn.
- **Rollback safe.** The agent ends a kept turn whose LLM step read the guidance with a
  `{"supervisor_read": true}` line; only then are the plain whispers used up. A turn cut by barge-in or
  superseded sends no such line, so they wait. A pre-fire rollback gives back what its turn used up.
- **Adopt can't be removed.** A mistake is fixed with a new Adopt that corrects it; the LLM sees both.
- **`<Say this>`** waits for the next point the agent would speak (it doesn't cut a reply in progress).
  It goes into the transcript as an agent line marked `by: person`, and the next turn tells the LLM it
  was already said. During a direct hold it is refused (the caller already hears the supervisor).

### How the agent sees it (the only takeover code inside the agent)

- Voicebot sends `__supervisor__` = `{adopt: [...], once: [...]}` inside `user_input`. The agent takes it
  out before the input reaches state, `__updated_vars__` or a rollback point.
- One generic hook in the shared LLM step class: the guidance is appended to the message sent to the LLM,
  labelled "Supervisor guidance (not said by the caller)". Plain whispers stay in that step's history so
  later turns know them; Adopts are re-sent each turn instead.
- No change to flow JSON, step types, routing or slot filling. A call with no whispers runs exactly as today.

## 2. Hold

```json
{ "type": "hold", "id": "c2", "mode": "relay" }
```

- **The flow freezes exactly where it is,** whatever step that is. The caller's speech is no longer sent
  to the agent (it is kept for the record and the resume note), and the inactivity timer is paused.
- **Any turn in progress is superseded:** voicebot drops its stream, and the agent's hold setting
  (`POST /agents/session/{id}/hold {"held": true}`) bumps the generation so its state is not written.
  While held, the agent refuses turns (409).
- **Cut-over:** audio already playing keeps playing, and is cut as soon as the supervisor's first speech
  is ready. If it ends first, there is silence; the call is on hold.
- **Modes:**
  - `relay` (default): the supervisor's speech is transcribed and spoken in the agent's voice (and avatar).
  - `direct` (full takeover): the supervisor's microphone goes straight to the caller (through the avatar's
    lipsync when there is one) and the caller's audio straight to the supervisor. Their words are still
    transcribed, for the transcript and the resume note.
- The supervisor hears the call audio. No transcript is sent to them.

## 3. Resume

```json
{ "type": "resume", "id": "c3" }
```

- The flow continues from the point it froze at and does whatever it would have done next.
- Everything said during the hold (supervisor lines as "Agent (human)", caller lines as "Caller") goes
  with the next agent turn as one-time guidance, with the instruction to continue without repeating what
  was said or asking again for what the caller already gave. The caller's words are never read as flags.
- The inactivity timer restarts from now.

### Safety timeout

The call resumes by itself if the supervisor's connection drops, or if nobody speaks for N seconds.
Silence is counted on both sides: the caller or the supervisor speaking resets it. The supervisor gets
`{"type": "timeout_warning", "seconds"}` before it fires, and it never resumes while the caller is speaking.
Set per flow as `takeover.silence-timeout-s` (default 20) and `takeover.warning-s` (default 5).

## 4. Call states

```
live ──hold──▶ holding ──resume / timeout / supervisor drops──▶ resuming ──▶ live
```

- Every change runs under one lock per call, so commands, the safety timeout and a dropped supervisor can't race.
- `hold` only from `live` (and only with a supervisor connected); anything else gets 409.
- `resume` only from `holding`. A double-click, or the timeout racing a manual resume: one wins, the other gets 409.
- Every command carries an `id`; a repeated id returns the first answer without running again.
- `whisper` is allowed in `live` and `holding`.
- If a resume step fails, the call still goes back to `live`. A call never stays stuck in a hold.
- Voicebot sends `{"type": "state", "state", "mode"}` on every change.

## 5. Record

- Every whisper: text, flag, sender, time, status, and the turn that used it. Archived as `whispers`.
- The transcript marks lines said by a person (`by: person`).
- Hold and resume events with time and offset into the call (mode, reason). Archived as `takeover_events`.
- A copy is written to Redis (`voicebot:takeover:<session_id>`) after every change, so a crash doesn't lose them.

## 6. Open, decided later

- What the flow does right after resume (speak first, or wait for the caller).
- Input steps that wait for something other than speech (web-navigation results, form values).
- Conditional steps that would have branched on something the caller said during the hold.
- A live caption of the supervisor's own speech.
- Phone calls (callbot), and routing a supervisor to the right voicebot server when there are several.
- Several supervisors on one call.
