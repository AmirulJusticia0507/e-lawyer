-- CreateEnum
CREATE TYPE "CitationDocumentType" AS ENUM ('GUGATAN', 'JAWABAN', 'REPLIK', 'DUPLIK', 'KESIMPULAN', 'PUTUSAN', 'MEMO', 'LAINNYA');

-- AlterTable
ALTER TABLE "Citation" ADD COLUMN     "documentTitle" TEXT,
ADD COLUMN     "documentType" "CitationDocumentType";

-- CreateIndex
CREATE INDEX "Citation_documentType_idx" ON "Citation"("documentType");

-- RenameIndex
ALTER INDEX "Amendment_amendingRegulationId_amendedRegulationId_articleId_ty" RENAME TO "Amendment_amendingRegulationId_amendedRegulationId_articleI_key";
