-- AlterTable
ALTER TABLE "Regulation" ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "searchVector" tsvector;

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "searchVector" tsvector;

-- AlterTable
ALTER TABLE "Jurisprudence" ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "searchVector" tsvector;

