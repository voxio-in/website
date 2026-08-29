-- AlterEnum
ALTER TYPE "CallStatus" ADD VALUE 'completed';

-- AlterTable
ALTER TABLE "CallRequest" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "transcript" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "CallRequest_gatewayRef_idx" ON "CallRequest"("gatewayRef");
