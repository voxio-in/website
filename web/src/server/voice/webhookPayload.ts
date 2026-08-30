// What the voice server posts back about a session, and how to read it.

type Turn = { role?: string; content?: string };

type RunningResponse = {
  session_id?: string;
  out?: unknown;
  error?: string;
};
type Payload = {
  status?: string;
  "session-data"?: {
    state?: {
      session_id?: string;
      step?: string;
      conversation_history?: Turn[];
    };
  };
  responses?: RunningResponse[];
  session_id?: string;
  sessionId?: string;
  "session-id"?: string;
  transcript?: unknown;
  conversation?: unknown;
  turns?: unknown;
};

function spokenText(out: unknown): string | null {
  if (typeof out === "string") return out.trim() || null;
  if (!out || typeof out !== "object") return null;
  const o = out as Record<string, unknown>;
  const candidate =
    o.speak ??
    (o.out_dict as Record<string, unknown> | undefined)?.speak ??
    o.text;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}

/** The id the post belongs to, wherever this version of the gateway put it. */
export function sessionIdOf(body: Payload | null): string | undefined {
  return (
    body?.['session-data']?.state?.session_id ||
    body?.responses?.find((r) => r?.session_id)?.session_id ||
    body?.session_id ||
    body?.sessionId ||
    body?.['session-id']
  );
}

export function nextTranscript(
  body: Payload,
  existing: Turn[],
): Turn[] | null {
  const history = body['session-data']?.state?.conversation_history;
  if (history) return history;

  const live = (body.responses ?? [])
    .map((r) => spokenText(r?.out))
    .filter((t): t is string => Boolean(t))
    .map((content) => ({ role: 'assistant', content }));

  return live.length ? [...existing, ...live] : null;
}

/** Whether this post says the session is over. */
export function isFinished(body: Payload): boolean {
  const status = (body.status || '').toLowerCase();
  return status.includes('complete') || status.includes('end');
}

export type { Payload, Turn };

/* ---------- the scene ----------

   The roleplay graphs return more than a spoken line. Every `response` node in
   cheryl/muthu/vps emits `frame` (which face he is wearing), `actions` (the
   physical things he does this turn) and, for cheryl and vps, a running
   `score`. tempp reads those back out of its own database and draws them; this
   is the same reading, against the same payload shape.

   Kept append-only and turn-numbered so the browser can poll for "anything
   after N" rather than re-reading the whole session every second. */

export type SceneBeat = {
  /** Monotonic, assigned on write. What the poller asks for "after". */
  n: number;
  /** The avatar's face or pose for this turn, as the model labelled it. */
  frame?: string;
  /** Physical things done this turn — "receipt", "shirt", "phone", … */
  actions?: string[];
  /** Running judgement, STATUS_VALUE form, e.g. "retry_5". cheryl/vps only. */
  score?: string;
};

function outObject(out: unknown): Record<string, unknown> | null {
  if (!out || typeof out !== "object") return null;
  const o = out as Record<string, unknown>;
  const inner = o.out_dict;
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return o;
}

/** The beats carried by one post, in order, ready to append. */
export function sceneBeats(body: Payload, from: number): SceneBeat[] {
  const beats: SceneBeat[] = [];
  let n = from;

  for (const response of body.responses ?? []) {
    const out = outObject(response?.out);
    if (!out) continue;

    const frame = typeof out.frame === "string" ? out.frame : undefined;
    const score = typeof out.score === "string" ? out.score : undefined;
    const actions = Array.isArray(out.actions)
      ? out.actions.filter((a): a is string => typeof a === "string" && !!a)
      : undefined;

    // `hold_frame` re-emits the face on its own to keep the avatar on it. That
    // is not a beat — appending it would replay the same face change forever.
    if (!frame && !score && !actions?.length) continue;

    beats.push({
      n: ++n,
      ...(frame ? { frame } : {}),
      ...(actions?.length ? { actions } : {}),
      ...(score ? { score } : {}),
    });
  }

  return beats;
}
