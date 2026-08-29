-- CreateTable
CREATE TABLE "RoomSession" (
    "id" TEXT NOT NULL,
    "demo" TEXT NOT NULL,
    "transcript" JSONB,
    "seconds" INTEGER,
    "endedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomSession_ip_createdAt_idx" ON "RoomSession"("ip", "createdAt");
