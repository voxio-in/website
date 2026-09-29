-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'reseller', 'user');

-- DropForeignKey
ALTER TABLE "AuthSession" DROP CONSTRAINT "AuthSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "DashFlow" DROP CONSTRAINT "DashFlow_userId_fkey";

-- DropForeignKey
ALTER TABLE "DashSession" DROP CONSTRAINT "DashSession_flowKey_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_userId_fkey";

-- DropTable
DROP TABLE "AuthSession";

-- DropTable
DROP TABLE "DashFlow";

-- DropTable
DROP TABLE "DashSession";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Workspace";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_key_rotated_at" TIMESTAMP(3),
    "integrations" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workflow" JSONB NOT NULL,
    "webhook-url" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flows" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "flow_name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "process-type" TEXT NOT NULL DEFAULT 'speech-native',
    "xml" TEXT NOT NULL DEFAULT '',
    "kbs" TEXT[],
    "faces" JSONB NOT NULL DEFAULT '{}',
    "stt_id" TEXT,
    "tts_id" TEXT,
    "vision_id" JSONB,
    "running_vision_id" JSONB,
    "runtime" JSONB NOT NULL DEFAULT '{}',
    "webhook-secret" TEXT,
    "webhook-events" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT,
    "is_preset" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT,
    "is_preset" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "recordingUrl" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "totalConnectedTime" DOUBLE PRECISION NOT NULL,
    "totalAiTime" DOUBLE PRECISION NOT NULL,
    "totalHumanTime" DOUBLE PRECISION NOT NULL,
    "timeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transcription" JSONB NOT NULL DEFAULT '[]',
    "humanTokens" INTEGER NOT NULL,
    "aiTokens" INTEGER NOT NULL,
    "tokenRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "from" TEXT,
    "to" TEXT,
    "status" TEXT,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numbers" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "user_api_key" TEXT NOT NULL,
    "flow_api_key" TEXT,
    "provider" TEXT,
    "label" TEXT,
    "attached_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faces" (
    "uuid" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'expression',
    "detector" TEXT NOT NULL DEFAULT 's3fd',
    "clip" JSONB NOT NULL DEFAULT '{}',
    "media" JSONB NOT NULL DEFAULT '{}',
    "coords" JSONB NOT NULL DEFAULT '[]',
    "version" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faces_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "kb_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'indexing',
    "chunks" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" INTEGER,
    "ms" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "request" JSONB NOT NULL,
    "response" TEXT,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "agents_user_id_idx" ON "agents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "flows_api_key_key" ON "flows"("api_key");

-- CreateIndex
CREATE INDEX "flows_user_id_idx" ON "flows"("user_id");

-- CreateIndex
CREATE INDEX "flows_agent_id_idx" ON "flows"("agent_id");

-- CreateIndex
CREATE INDEX "stt_user_id_idx" ON "stt"("user_id");

-- CreateIndex
CREATE INDEX "tts_user_id_idx" ON "tts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionId_key" ON "sessions"("sessionId");

-- CreateIndex
CREATE INDEX "sessions_flow_id_startTime_idx" ON "sessions"("flow_id", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "numbers_phone_number_key" ON "numbers"("phone_number");

-- CreateIndex
CREATE INDEX "numbers_user_api_key_idx" ON "numbers"("user_api_key");

-- CreateIndex
CREATE INDEX "numbers_flow_api_key_idx" ON "numbers"("flow_api_key");

-- CreateIndex
CREATE INDEX "faces_user_id_idx" ON "faces"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_bases_user_id_idx" ON "knowledge_bases"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_sources_kb_id_idx" ON "knowledge_sources"("kb_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_flow_id_at_idx" ON "webhook_deliveries"("flow_id", "at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_stt_id_fkey" FOREIGN KEY ("stt_id") REFERENCES "stt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flows" ADD CONSTRAINT "flows_tts_id_fkey" FOREIGN KEY ("tts_id") REFERENCES "tts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stt" ADD CONSTRAINT "stt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tts" ADD CONSTRAINT "tts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numbers" ADD CONSTRAINT "numbers_user_api_key_fkey" FOREIGN KEY ("user_api_key") REFERENCES "users"("api_key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numbers" ADD CONSTRAINT "numbers_flow_api_key_fkey" FOREIGN KEY ("flow_api_key") REFERENCES "flows"("api_key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_kb_id_fkey" FOREIGN KEY ("kb_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

