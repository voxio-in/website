// POST /api/call-webhook — where the gateway posts a phone call's progress.

import { createFileRoute } from "@tanstack/react-router";

import { db } from "#/server/db";
import {
  isFinished,
  nextTranscript,
  sessionIdOf,
  type Payload,
  type Turn,
} from "#/server/voice/webhookPayload";

export const Route = createFileRoute("/api/call-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const body = (() => {
          try {
            return JSON.parse(raw) as Payload;
          } catch {
            return null;
          }
        })();

        console.log(`[call-webhook] ${body?.status ?? "?"} ${raw.length}b`);

        const id = sessionIdOf(body);
        if (!body || !id) {
          return Response.json({ ok: false, reason: "no session id" });
        }

        const row = await db.callRequest.findUnique({ where: { id } });
        if (!row) return Response.json({ ok: false, reason: "unknown session" });

        const existing = Array.isArray(row.transcript)
          ? (row.transcript as Turn[])
          : [];
        const transcript = nextTranscript(body, existing);
        const finished = isFinished(body);

        await db.callRequest.update({
          where: { id },
          data: {
            status: finished ? "completed" : row.status,
            outcome: body.status || row.outcome,
            endedAt: finished ? new Date() : row.endedAt,
            ...(transcript ? { transcript } : {}),
          },
        });

        return Response.json({ ok: true });
      },
    },
  },
});
