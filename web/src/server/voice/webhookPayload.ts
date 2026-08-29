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
