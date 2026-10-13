-- CreateEnum
CREATE TYPE "RegulationType" AS ENUM ('CONSTITUTION', 'LAW', 'GOVERNMENT_REGULATION', 'PRESIDENTIAL_REGULATION', 'MINISTERIAL_REGULATION', 'SUPREME_COURT_REGULATION', 'SUPREME_COURT_CIRCULAR', 'CIVIL_CODE', 'CRIMINAL_CODE', 'PROCEDURAL_LAW', 'LOCAL_REGULATION', 'OTHER');

CREATE TYPE "LegalSourceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'AMENDED', 'REPEALED', 'UNKNOWN');

CREATE TYPE "AmendmentType" AS ENUM ('AMENDS', 'REPEALS', 'REPLACES', 'SUPPLEMENTS');

CREATE TYPE "CitationValidationStatus" AS ENUM ('PENDING', 'VALID', 'WARNING', 'INVALID');

CREATE TYPE "JurisprudenceStatus" AS ENUM ('ACTIVE', 'OVERRULED', 'DISTINGUISHED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Regulation" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "RegulationType" NOT NULL,
    "number" TEXT,
    "year" INTEGER,
    "title" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction",
    "status" "LegalSourceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "issuedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Regulation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Regulation_effective_period_check" CHECK ("effectiveUntil" IS NULL OR "effectiveFrom" IS NULL OR "effectiveUntil" >= "effectiveFrom")
);

CREATE TABLE "Article" (
    "id" UUID NOT NULL,
    "regulationId" UUID NOT NULL,
    "unitKey" TEXT NOT NULL,
    "articleNumber" TEXT NOT NULL,
    "paragraphNumber" TEXT,
    "heading" TEXT,
    "content" TEXT NOT NULL,
    "status" "LegalSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Article_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Article_effective_period_check" CHECK ("effectiveUntil" IS NULL OR "effectiveFrom" IS NULL OR "effectiveUntil" >= "effectiveFrom")
);

CREATE TABLE "Amendment" (
    "id" UUID NOT NULL,
    "amendingRegulationId" UUID NOT NULL,
    "amendedRegulationId" UUID NOT NULL,
    "articleId" UUID,
    "type" "AmendmentType" NOT NULL DEFAULT 'AMENDS',
    "effectiveAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Amendment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Amendment_distinct_regulations_check" CHECK ("amendingRegulationId" <> "amendedRegulationId")
);

CREATE TABLE "Jurisprudence" (
    "id" UUID NOT NULL,
    "decisionNumber" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "decisionDate" TIMESTAMP(3) NOT NULL,
    "caseClassification" TEXT,
    "judges" TEXT[] NOT NULL,
    "summary" TEXT,
    "legalHolding" TEXT,
    "fullText" TEXT,
    "sourceUrl" TEXT,
    "checksum" TEXT,
    "status" "JurisprudenceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Jurisprudence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Citation" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "caseId" UUID,
    "jurisprudenceId" UUID,
    "quote" TEXT,
    "context" TEXT,
    "validationStatus" "CitationValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationMessage" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Citation_single_source_check" CHECK (num_nonnulls("caseId", "jurisprudenceId") = 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "Regulation_slug_key" ON "Regulation"("slug");
CREATE INDEX "Regulation_type_number_year_idx" ON "Regulation"("type", "number", "year");
CREATE INDEX "Regulation_jurisdiction_idx" ON "Regulation"("jurisdiction");
CREATE INDEX "Regulation_status_idx" ON "Regulation"("status");
CREATE INDEX "Regulation_effectiveFrom_effectiveUntil_idx" ON "Regulation"("effectiveFrom", "effectiveUntil");
CREATE UNIQUE INDEX "Article_regulationId_unitKey_key" ON "Article"("regulationId", "unitKey");
CREATE INDEX "Article_regulationId_articleNumber_idx" ON "Article"("regulationId", "articleNumber");
CREATE INDEX "Article_status_idx" ON "Article"("status");
CREATE INDEX "Article_effectiveFrom_effectiveUntil_idx" ON "Article"("effectiveFrom", "effectiveUntil");
CREATE UNIQUE INDEX "Amendment_amendingRegulationId_amendedRegulationId_articleId_type_key" ON "Amendment"("amendingRegulationId", "amendedRegulationId", "articleId", "type");
CREATE INDEX "Amendment_amendedRegulationId_idx" ON "Amendment"("amendedRegulationId");
CREATE INDEX "Amendment_articleId_idx" ON "Amendment"("articleId");
CREATE INDEX "Amendment_effectiveAt_idx" ON "Amendment"("effectiveAt");
CREATE UNIQUE INDEX "Jurisprudence_courtName_decisionNumber_key" ON "Jurisprudence"("courtName", "decisionNumber");
CREATE INDEX "Jurisprudence_jurisdiction_idx" ON "Jurisprudence"("jurisdiction");
CREATE INDEX "Jurisprudence_decisionDate_idx" ON "Jurisprudence"("decisionDate");
CREATE INDEX "Jurisprudence_status_idx" ON "Jurisprudence"("status");
CREATE INDEX "Citation_articleId_idx" ON "Citation"("articleId");
CREATE INDEX "Citation_caseId_idx" ON "Citation"("caseId");
CREATE INDEX "Citation_jurisprudenceId_idx" ON "Citation"("jurisprudenceId");
CREATE INDEX "Citation_validationStatus_idx" ON "Citation"("validationStatus");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "Regulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_amendingRegulationId_fkey" FOREIGN KEY ("amendingRegulationId") REFERENCES "Regulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_amendedRegulationId_fkey" FOREIGN KEY ("amendedRegulationId") REFERENCES "Regulation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_jurisprudenceId_fkey" FOREIGN KEY ("jurisprudenceId") REFERENCES "Jurisprudence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
