// One PrismaClient per process. Vite reloads modules on every change in dev, and
// a fresh client per reload exhausts the database's connection pool within a few
// edits, so it is cached on globalThis.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function withDb<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      !/kind: Closed|Connection closed|Can't reach database server/i.test(
        message,
      )
    )
      throw err;
    await db.$disconnect().catch(() => {});
    return run();
  }
}
