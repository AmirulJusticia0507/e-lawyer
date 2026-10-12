-- Pencarian full-text (Postgres FTS) untuk katalog peraturan & yurisprudensi.
-- Kolom tsvector dibuat sebagai GENERATED ALWAYS ... STORED sehingga selalu sinkron
-- dengan kolom sumber tanpa perlu trigger.

-- AlterTable
ALTER TABLE "Regulation"
ADD COLUMN "searchVector" tsvector
GENERATED ALWAYS AS (
    to_tsvector(
        'simple',
        coalesce("title", '') || ' ' ||
        coalesce("number", '') || ' ' ||
        coalesce("sourceName", '')
    )
) STORED;

-- AlterTable
ALTER TABLE "Article"
ADD COLUMN "searchVector" tsvector
GENERATED ALWAYS AS (
    to_tsvector(
        'simple',
        coalesce("heading", '') || ' ' ||
        coalesce("content", '')
    )
) STORED;

-- AlterTable
ALTER TABLE "Jurisprudence"
ADD COLUMN "searchVector" tsvector
GENERATED ALWAYS AS (
    to_tsvector(
        'simple',
        coalesce("summary", '') || ' ' ||
        coalesce("legalHolding", '') || ' ' ||
        coalesce("caseClassification", '') || ' ' ||
        coalesce("fullText", '') || ' ' ||
        coalesce("courtName", '') || ' ' ||
        coalesce("decisionNumber", '')
    )
) STORED;

-- CreateIndex
CREATE INDEX "Regulation_searchVector_idx" ON "Regulation" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Article_searchVector_idx" ON "Article" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Jurisprudence_searchVector_idx" ON "Jurisprudence" USING GIN ("searchVector");

-- Pencarian semantik (pgvector). Embedding diisi oleh pipeline AI (F8).
-- AlterTable
ALTER TABLE "Article" ADD COLUMN "embedding" vector(1536);

-- AlterTable
ALTER TABLE "Jurisprudence" ADD COLUMN "embedding" vector(1536);

-- CreateIndex
CREATE INDEX "Article_embedding_idx" ON "Article" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- CreateIndex
CREATE INDEX "Jurisprudence_embedding_idx" ON "Jurisprudence" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);