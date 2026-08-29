-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('pending', 'dialing', 'failed', 'blocked');

-- CreateTable
CREATE TABLE "CallRequest" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "university" TEXT,
    "status" "CallStatus" NOT NULL DEFAULT 'pending',
    "gatewayRef" TEXT,
    "error" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallRequest_phone_createdAt_idx" ON "CallRequest"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "CallRequest_ip_createdAt_idx" ON "CallRequest"("ip", "createdAt");
