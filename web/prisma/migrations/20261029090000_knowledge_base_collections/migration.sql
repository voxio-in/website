-- Knowledge bases get the Milvus collection that holds their vectors and the
-- embedding model that built it. Existing rows get `kb_<id>` (Milvus names
-- allow only letters, digits and underscores).
ALTER TABLE "knowledge_bases" ADD COLUMN "collection_name" TEXT;
ALTER TABLE "knowledge_bases" ADD COLUMN "embeddings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "knowledge_bases" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "knowledge_bases" SET "collection_name" = 'kb_' || regexp_replace("id", '[^A-Za-z0-9_]', '_', 'g');

ALTER TABLE "knowledge_bases" ALTER COLUMN "collection_name" SET NOT NULL;

CREATE UNIQUE INDEX "knowledge_bases_collection_name_key" ON "knowledge_bases"("collection_name");
