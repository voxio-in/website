-- Knowledge bases get the settings their documents are chunked with (chunk size, overlap, captioning),
-- and each uploaded PDF becomes a document row with its original in Cloudflare R2.
ALTER TABLE "knowledge_bases" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "kb_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "r2_key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "images_skipped" INTEGER NOT NULL DEFAULT 0,
    "chunks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_documents_kb_id_sha256_key" ON "knowledge_documents"("kb_id", "sha256");
CREATE INDEX "knowledge_documents_kb_id_idx" ON "knowledge_documents"("kb_id");
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_kb_id_fkey" FOREIGN KEY ("kb_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
