# Variable history per call — spec

**Status:** proposal, for the backend (agent service). The dashboard side waits on this.
**Date:** 2026-11-02

## Why

A flow's AI steps work out values during a call (`llm_return_type` fields such as
`inquiry_type`, `course`, `call_outcome`). Today those values live only in the session
state in Redis and in the webhook payload. When the call is archived, only the transcript
and timing are kept, so dashboards, lead exports and follow-up lists have nothing to count.

We want each archived call to carry, for the variables the flow records:

- the **final value**, and
- the **history**: every change, with when it happened and on which turn.

All of this is written by code (the agent service), never by an LLM.

## What gets stored

On the session row, inside `extra` (no schema change), a `variables` object:

```json
{
  "variables": {
    "inquiry_type": {
      "value": "admission",
      "history": [
        { "value": "other",     "at": "2026-11-02T10:01:12.481Z", "turn": 3 },
        { "value": "admission", "at": "2026-11-02T10:01:40.902Z", "turn": 5 }
      ]
    },
    "callback_wanted": {
      "value": true,
      "history": [
        { "value": true, "at": "2026-11-02T10:02:05.110Z", "turn": 7 }
      ]
    }
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `variables.<name>.value` | any JSON | The value at the end of the call (same as the last history entry). Saved so readers never scan the list. |
| `variables.<name>.history` | list | One entry per **change**, oldest first. |
| `history[].value` | any JSON | The new value. |
| `history[].at` | string | ISO 8601 UTC time the turn that changed it finished, with milliseconds. |
| `history[].turn` | int | The turn number (1 = first `/turn` call of the session), so it lines up with the transcript. |

A variable that never got a value (still its default) is **left out**. Readers treat a
missing variable as "never known".

## Which variables

Tracked: every name in the workflow's `variables` declaration (`workflow.variables`) that
is **not** a system or per-turn one. Excluded:

```
user_input, conversation_history (and any history_key), speak, hangup, node_type,
llm_response, __updated_vars__, any name starting with "__"
```

**Why `conversation_history` is excluded.** It is appended to on every turn. Tracking it would
store a full copy of the conversation per turn, which grows with the square of the call length
(about 100 copies for a 106-turn call). It is already archived as `transcription`. The history
here is always **flat**: one list per variable, each entry `{value, at, turn}`, never a nested
copy of the state. (The existing per-turn state snapshots in `session_data['history']`, used for
rollback, do copy the whole state. They stay as they are, capped by `HISTORY_LIMIT`, and are not
archived. This spec only reads the previous turn's values from them.)

The dashboard's `record_fields` tool adds the fields a user wants recorded to both the AI
step's `llm_return_type` and `workflow.variables`, so declared = tracked.

## When an entry is added (the rule)

At the **end of each turn**, compare each tracked variable's value with its value at the
**start** of that turn. If it differs (deep equality on the JSON value), append one entry.

- Same value repeated every turn → no new entry.
- Changed and changed back within one turn → no entry (only turn-end values count).
- Set to `null` / `""` after having a value → an entry with that value (it was cleared).

### Why the turn end, not each step

`WorkflowEngine.run` runs steps in parallel and streams them, and it can drop a step past
its stream timeout and **revert its state**. Diffing once per turn, after the engine is done,
records only what really stuck. No change is needed inside the engine or the nodes.

## Where in the code

`agent/src/agent/routers/agents/server.py`, the turn handler:

1. **Start of turn.** It already snapshots the state before the turn:
   `session_data['history'].append({'state': copy.deepcopy(state), ...})` (around line 301).
   Use that snapshot as "before". It is taken *before* `state.update(req.user_input)`, so
   values that arrive in the request are counted too.
2. **End of turn.** In the `finally` block where `session_data['state'] = state` is written
   (around line 318), and **only when the turn isn't superseded** (the existing `[GEN-GUARD]`
   check):
   - For each tracked name, `if state.get(name) != before.get(name)`, append
     `{"value": state[name], "at": utc_now_iso(), "turn": session_data['generation']}`
     to `session_data['variables'][name]['history']` and set `.value`.
   - Store it on `session_data['variables']` (Redis, with the session), not in `state`,
     so the workflow and the LLM never see it.
3. **Rollback** (`/session/.../rollback`, around line 355, pops a history snapshot). Also
   drop the history entries whose `turn` is later than the restored snapshot's turn, and
   reset each `.value` to its new last entry (or remove the variable if none remain).
4. **Archive.** In `end_session_pl`, add `'variables': session_data.get('variables', {})` to
   the JSON posted to `add-session-url`. The database service already puts unknown keys
   into `extra` (`database/session_.py`, the `extra = {...}` comprehension, merged with
   `extra || EXCLUDED.extra`), so nothing changes there. The same goes for every other
   archive path (browser and chat sessions), if they post separately.
5. **Webhook.** No change needed (it already sends `session-data`). The new
   `variables` key will appear in it, which is useful to integrators.

## Limits

- At most **50 entries per variable**. When full, keep the first entry and the latest 49
  (the first is when it became known, the rest are the recent changes).
- A value over **2 KB** of JSON is stored truncated as `{"truncated": true, "preview": "<first 500 chars>"}`.
  These are meant to be short categories, numbers and names, not documents.
- At most **40 tracked variables** per call. Past that, the rest are skipped and a single
  `"variables_skipped": <count>` is added next to `variables`.

## Privacy

Values can hold personal data the caller said (name, phone, city). They are stored the
same way and with the same access as the transcript, which already contains them. No new
exposure, but don't log the history at info level.

## What the dashboard will do with it (for context)

- **Field widgets:** counts by `value`, values over time, yes/no shares, averages,
  cross tables (e.g. `inquiry_type` × `call_outcome`), and filters on the calls table.
- **History widgets:** funnels ("course known → date known → booked"), "known by turn N",
  time-to-known, what was known when dropped calls ended.
- **Per-call timeline** on the session page, next to the transcript (`turn` links them).
- **Ask Voxio** reads `value` and `history` first. Most data questions then need no AI
  reading of transcripts at all.
- **Older calls** have no `variables`. A one-time transcript-based backfill may fill
  `value` only, marked `"derived": true`, with no history. That is separate from this spec.

## Acceptance checks

1. A call where `inquiry_type` goes other → admission on turns 3 and 5 is archived with
   two history entries, `value: "admission"`, and turns 3 and 5.
2. A value repeated on every turn produces one entry.
3. A step dropped by the stream timeout leaves no entry for the values it had set.
4. A rollback removes the entries from the rolled-back turns.
5. A superseded turn (GEN-GUARD) adds no entries.
6. `user_input`, `conversation_history`, `speak`, `hangup` and `node_type` never appear.
7. The archived row has `extra.variables`, and the existing transcript and timing are unchanged.
8. A flow with no tracked variables archives exactly as today (no `variables` key, or `{}`).
