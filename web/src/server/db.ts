// One PrismaClient per process. Vite reloads modules on every change in dev, and
// a fresh client per reload exhausts the database's connection pool within a few
// edits, so it is cached on globalThis.
//
// Neon closes idle connections (the compute suspends after a few idle minutes, and
// the pooler drops idle clients). Each pooled connection then logs
// "Error in PostgreSQL connection: Error { kind: Closed }". Nothing fails: the next
// query opens a new connection, and withDb retries one that raced the close. Those
// lines are dropped here; every other error and warning is still printed.

import { PrismaClient, type Prisma } from "@prisma/client";

const CLOSED = /kind: Closed|Connection closed|Can't reach database server/i;

function create() {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "error" },
      ...(process.env.NODE_ENV === "development"
        ? [{ emit: "event", level: "warn" } as const]
        : []),
    ],
  });
  const print = (level: "error" | "warn") => (e: Prisma.LogEvent) => {
    if (!CLOSED.test(e.message)) console[level](`prisma:${level} ${e.message}`);
  };
  client.$on("error", print("error"));
  client.$on("warn", print("warn"));
  return client;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function withDb<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!CLOSED.test(message)) throw err;
    await db.$disconnect().catch(() => {});
    return run();
  }
}
