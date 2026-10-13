CREATE TYPE "DocumentType" AS ENUM (
    'POWER_OF_ATTORNEY',
    'COMPLAINT',
    'ANSWER',
    'REPLY',
    'DUPLICATION',
    'CONCLUSION',
    'JUDGMENT',
    'OTHER'
);

CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SIGNED', 'ARCHIVED');
CREATE TYPE "PowerOfAttorneyType" AS ENUM ('GENERAL', 'SPECIFIC', 'SPECIAL');
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'REVOKED', 'FAILED');
CREATE TYPE "JudgmentVerdict" AS ENUM ('GRANTED', 'REJECTED', 'INADMISSIBLE', 'SETTLED', 'DEFAULT', 'OTHER');

CREATE TABLE "Template" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "structure" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "templateId" UUID,
    "createdById" UUID,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "storageKey" TEXT,
    "sha256" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "changeSummary" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Signature" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "signerId" UUID,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "signatureHash" TEXT,
    "certificateId" TEXT,
    "metadata" JSONB,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PowerOfAttorney" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "clientId" UUID,
    "attorneyUserId" UUID,
    "type" "PowerOfAttorneyType" NOT NULL,
    "principalName" TEXT NOT NULL,
    "principalNik" TEXT,
    "principalNpwp" TEXT,
    "attorneyName" TEXT NOT NULL,
    "attorneyLicenseNo" TEXT,
    "attorneyNpwp" TEXT,
    "authority" JSONB,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PowerOfAttorney_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Judgment" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "signedByUserId" UUID,
    "verdict" "JudgmentVerdict" NOT NULL DEFAULT 'OTHER',
    "header" JSONB,
    "partyIdentities" JSONB,
    "caseSummary" TEXT NOT NULL,
    "considerations" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "closing" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Judgment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Template_name_version_jurisdiction_key" ON "Template"("name", "version", "jurisdiction");
CREATE INDEX "Template_documentType_jurisdiction_isActive_idx" ON "Template"("documentType", "jurisdiction", "isActive");
CREATE INDEX "Template_createdById_idx" ON "Template"("createdById");
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");
CREATE INDEX "Document_caseId_type_status_idx" ON "Document"("caseId", "type", "status");
CREATE INDEX "Document_templateId_idx" ON "Document"("templateId");
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");
CREATE INDEX "Document_sha256_idx" ON "Document"("sha256");
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");
CREATE INDEX "DocumentVersion_createdById_idx" ON "DocumentVersion"("createdById");
CREATE INDEX "Signature_documentId_status_idx" ON "Signature"("documentId", "status");
CREATE INDEX "Signature_signerId_idx" ON "Signature"("signerId");
CREATE UNIQUE INDEX "PowerOfAttorney_documentId_key" ON "PowerOfAttorney"("documentId");
CREATE INDEX "PowerOfAttorney_clientId_idx" ON "PowerOfAttorney"("clientId");
CREATE INDEX "PowerOfAttorney_attorneyUserId_idx" ON "PowerOfAttorney"("attorneyUserId");
CREATE INDEX "PowerOfAttorney_type_validUntil_idx" ON "PowerOfAttorney"("type", "validUntil");
CREATE UNIQUE INDEX "Judgment_documentId_key" ON "Judgment"("documentId");
CREATE INDEX "Judgment_signedByUserId_idx" ON "Judgment"("signedByUserId");
CREATE INDEX "Judgment_publishedAt_idx" ON "Judgment"("publishedAt");

ALTER TABLE "Template" ADD CONSTRAINT "Template_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_signerId_fkey"
    FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PowerOfAttorney" ADD CONSTRAINT "PowerOfAttorney_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PowerOfAttorney" ADD CONSTRAINT "PowerOfAttorney_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PowerOfAttorney" ADD CONSTRAINT "PowerOfAttorney_attorneyUserId_fkey"
    FOREIGN KEY ("attorneyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Judgment" ADD CONSTRAINT "Judgment_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Judgment" ADD CONSTRAINT "Judgment_signedByUserId_fkey"
    FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
