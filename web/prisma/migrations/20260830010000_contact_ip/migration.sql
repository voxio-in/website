ALTER TABLE "ContactSubmission" ADD COLUMN     "ip" TEXT;

CREATE INDEX "ContactSubmission_ip_createdAt_idx" ON "ContactSubmission"("ip", "createdAt");
