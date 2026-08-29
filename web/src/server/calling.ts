// The demo call on /calling: the visitor picks a desk, gives their number, the
// gateway rings them, and that desk's agent talks.

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { CallStatus } from "@prisma/client";

import { db, withDb } from "#/server/db";
import { SERVERS } from "#/server/voice/servers";
import { DESKS, deskById, type DeskId } from "#/lib/desks";
import { buildNimcCustoms } from "#/server/voice/admissionsCall";

const GATEWAY = SERVERS.callbot;
const FROM_NUMBER = process.env.VOXIO_FROM_NUMBER;
const USER_API_KEY = process.env.VOXIO_USER_API_KEY;

function flowKeyFor(desk: DeskId): string | undefined {
  return (
    process.env[`VOXIO_FLOW_API_KEY_${desk.toUpperCase()}`] ||
    process.env.VOXIO_FLOW_API_KEY
  );
}

export function configuredDesks(): DeskId[] {
  if (!GATEWAY || !FROM_NUMBER || !USER_API_KEY) return [];
  return DESKS.filter((d) => flowKeyFor(d.id)).map((d) => d.id);
}

const MAX_PER_NUMBER_PER_HOUR = Number(process.env.CALL_LIMIT_PER_NUMBER_HOUR) || 3;
const MAX_PER_IP_PER_DAY = Number(process.env.CALL_LIMIT_PER_IP_DAY) || 10;

export type CallResult =
  | { ok: true; dialing: string; callId: string }
  | { ok: false; reason: string };

export type CallTurn = { who: 'caller' | 'agent'; text: string };

export type CallProgress = {
  status: string;
  turns: CallTurn[];
  endedAt: string | null;
};

const DEFAULT_COUNTRY_CODE = process.env.CALL_DEFAULT_COUNTRY_CODE || '91';

function normalise(raw: string): string | null {
  let n = raw.trim().replace(/[\s\-().]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  if (/^[6-9]\d{9}$/.test(n)) n = DEFAULT_COUNTRY_CODE + n;
  if (!/^[1-9]\d{9,14}$/.test(n)) return null;
  return n;
}

function clientIp(): string | null {
  const h = getRequest().headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export const requestDemoCall = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; org: string; desk: string }) => data)
  .handler(async ({ data }): Promise<CallResult> => {
    const phone = normalise(data.phone || "");
    const desk = deskById(data.desk || "");
    const org = (data.org || "").trim().slice(0, 120);

    if (!phone) {
      return {
        ok: false,
        reason:
          "That does not look like a phone number. Ten digits for an Indian mobile, or the full number with its country code.",
      };
    }
    const flowKey = flowKeyFor(desk.id);
    if (!GATEWAY || !FROM_NUMBER || !USER_API_KEY || !flowKey) {
      return {
        ok: false,
        reason: `The ${desk.label.toLowerCase()} desk is not connected to this page yet. Write to hello@voxio.ai and we will set up a call.`,
      };
    }

    const ip = clientIp();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const placed: { in: CallStatus[] } = { in: ["dialing", "completed"] };
    const [byNumber, byIp] = await withDb(() =>
      Promise.all([
        db.callRequest.count({
          where: { phone, status: placed, createdAt: { gte: hourAgo } },
        }),
        ip
          ? db.callRequest.count({
              where: { ip, status: placed, createdAt: { gte: dayAgo } },
            })
          : Promise.resolve(0),
      ]),
    );

    if (byNumber >= MAX_PER_NUMBER_PER_HOUR || byIp >= MAX_PER_IP_PER_DAY) {
      await db.callRequest.create({
        data: { phone, org, desk: desk.id, ip, status: "blocked" },
      });
      return {
        ok: false,
        reason:
          byNumber >= MAX_PER_NUMBER_PER_HOUR
            ? "That number has been called a few times already. Try again in an hour."
            : "Too many calls from here today. Try again tomorrow.",
      };
    }

    const record = await withDb(() =>
      db.callRequest.create({
        data: {
          phone,
          org,
          desk: desk.id,
          ip,
          userAgent: getRequest().headers.get("user-agent"),
          status: "pending",
        },
      }),
    );

    try {
      const res = await fetch(`https://${GATEWAY}/plivo/outbound`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          user_api_key: USER_API_KEY,
          flow_api_key: flowKey,
        },
        body: JSON.stringify({
          "from-number": FROM_NUMBER,
          "to-number": phone,
          session_id: record.id,
          customs: buildNimcCustoms({ desk: desk.id, brand: org || desk.defaultBrand }),
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[calling] gateway rejected the call — ${res.status} ${res.statusText}: ${body.slice(0, 500)}`,
        );
        await db.callRequest.update({
          where: { id: record.id },
          data: {
            status: "failed",
            error: `${res.status} ${body}`.slice(0, 500),
          },
        });
        return {
          ok: false,
          reason:
            "The line did not pick up our request. Try again in a moment.",
        };
      }

      const payload = (await res.json().catch(() => null)) as {
        session_id?: string;
        call_uuid?: string;
      } | null;

      await db.callRequest.update({
        where: { id: record.id },
        data: {
          status: "dialing",
          gatewayRef: payload?.call_uuid || payload?.session_id || null,
        },
      });

      return { ok: true, dialing: `+${phone}`, callId: record.id };
    } catch (err) {
      await db.callRequest.update({
        where: { id: record.id },
        data: {
          status: "failed",
          error: (err instanceof Error ? err.message : String(err)).slice(
            0,
            500,
          ),
        },
      });
      return {
        ok: false,
        reason:
          "We could not reach the calling gateway. Try again in a moment.",
      };
    }
  });

export const getCallProgress = createServerFn({ method: 'GET' })
  .inputValidator((data: { callId: string }) => data)
  .handler(async ({ data }): Promise<CallProgress> => {
    const row = await withDb(() =>
      db.callRequest.findUnique({
        where: { id: data.callId },
        select: { status: true, transcript: true, endedAt: true },
      }),
    );
    if (!row) return { status: 'unknown', turns: [], endedAt: null };

    const raw = Array.isArray(row.transcript) ? (row.transcript as unknown[]) : [];
    const turns: CallTurn[] = [];
    for (const item of raw) {
      const t = item as { role?: string; content?: string };
      if (!t || t.role === 'system') continue;
      const text = String(t.content ?? '')
        .replace(/^user_input\s*:\s*/, '')
        .replace(/<\|speak\|>/g, '')
        .replace(/<\|hangup\|>(true|false)/g, '')
        .trim();
      if (!text) continue;
      turns.push({ who: t.role === 'assistant' ? 'agent' : 'caller', text });
    }

    return {
      status: row.status,
      turns,
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    };
  });
