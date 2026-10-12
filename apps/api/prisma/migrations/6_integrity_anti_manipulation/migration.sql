-- CreateEnum
CREATE TYPE "IntegrityEntityType" AS ENUM ('ATTACHMENT', 'ADDENDUM', 'OFFICIAL_COPY');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('SENT', 'CONFIRMED', 'DISPUTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('UPLOAD_BURST', 'BACKDATE_SUSPECT', 'CLAIM_CHANGED', 'DELAY_PATTERN', 'HASH_MISMATCH', 'DEADLINE_BREACH');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('OPEN', 'MET', 'BREACHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrityCheckResult" AS ENUM ('MATCH', 'MISMATCH', 'MISSING_FILE');

-- CreateTable
CREATE TABLE "IntegrityRecord" (
    "id" UUID NOT NULL,
    "entityType" "IntegrityEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "caseId" UUID,
    "consultationId" UUID,
    "sha256" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'sha256',
    "sizeBytes" INTEGER,
    "storageKey" TEXT,
    "tsaToken" TEXT,
    "tsaUrl" TEXT,
    "anchorHash" TEXT,
    "anchoredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityCheck" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "expectedSha256" TEXT NOT NULL,
    "actualSha256" TEXT,
    "result" "IntegrityCheckResult" NOT NULL,
    "note" TEXT,
    "checkedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Addendum" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "authorId" UUID,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Addendum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReceipt" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "recipientPartyId" UUID NOT NULL,
    "senderId" UUID,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'SENT',
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmNote" TEXT,

    CONSTRAINT "DocumentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyFlag" (
    "id" UUID NOT NULL,
    "type" "AnomalyType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "caseId" UUID,
    "recordId" UUID,
    "subject" TEXT NOT NULL,
    "subjectId" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDeadline" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'OPEN',
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "lastExtensionReason" TEXT,
    "extendedAt" TIMESTAMP(3),
    "breachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrityRecord_caseId_idx" ON "IntegrityRecord"("caseId");

-- CreateIndex
CREATE INDEX "IntegrityRecord_consultationId_idx" ON "IntegrityRecord"("consultationId");

-- CreateIndex
CREATE INDEX "IntegrityRecord_sha256_idx" ON "IntegrityRecord"("sha256");

-- CreateIndex
CREATE INDEX "IntegrityRecord_createdAt_idx" ON "IntegrityRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrityRecord_entityType_entityId_key" ON "IntegrityRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IntegrityCheck_recordId_idx" ON "IntegrityCheck"("recordId");

-- CreateIndex
CREATE INDEX "IntegrityCheck_result_idx" ON "IntegrityCheck"("result");

-- CreateIndex
CREATE INDEX "IntegrityCheck_createdAt_idx" ON "IntegrityCheck"("createdAt");

-- CreateIndex
CREATE INDEX "Addendum_caseId_idx" ON "Addendum"("caseId");

-- CreateIndex
CREATE INDEX "Addendum_recordId_idx" ON "Addendum"("recordId");

-- CreateIndex
CREATE INDEX "Addendum_createdAt_idx" ON "Addendum"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReceipt_token_key" ON "DocumentReceipt"("token");

-- CreateIndex
CREATE INDEX "DocumentReceipt_caseId_idx" ON "DocumentReceipt"("caseId");

-- CreateIndex
CREATE INDEX "DocumentReceipt_recordId_idx" ON "DocumentReceipt"("recordId");

-- CreateIndex
CREATE INDEX "DocumentReceipt_recipientPartyId_idx" ON "DocumentReceipt"("recipientPartyId");

-- CreateIndex
CREATE INDEX "DocumentReceipt_status_idx" ON "DocumentReceipt"("status");

-- CreateIndex
CREATE INDEX "AnomalyFlag_caseId_idx" ON "AnomalyFlag"("caseId");

-- CreateIndex
CREATE INDEX "AnomalyFlag_recordId_idx" ON "AnomalyFlag"("recordId");

-- CreateIndex
CREATE INDEX "AnomalyFlag_type_idx" ON "AnomalyFlag"("type");

-- CreateIndex
CREATE INDEX "AnomalyFlag_status_idx" ON "AnomalyFlag"("status");

-- CreateIndex
CREATE INDEX "AnomalyFlag_severity_idx" ON "AnomalyFlag"("severity");

-- CreateIndex
CREATE INDEX "AnomalyFlag_createdAt_idx" ON "AnomalyFlag"("createdAt");

-- CreateIndex
CREATE INDEX "CaseDeadline_caseId_idx" ON "CaseDeadline"("caseId");

-- CreateIndex
CREATE INDEX "CaseDeadline_status_idx" ON "CaseDeadline"("status");

-- CreateIndex
CREATE INDEX "CaseDeadline_dueAt_idx" ON "CaseDeadline"("dueAt");

-- AddForeignKey
ALTER TABLE "IntegrityRecord" ADD CONSTRAINT "IntegrityRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityRecord" ADD CONSTRAINT "IntegrityRecord_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityRecord" ADD CONSTRAINT "IntegrityRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityCheck" ADD CONSTRAINT "IntegrityCheck_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "IntegrityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityCheck" ADD CONSTRAINT "IntegrityCheck_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addendum" ADD CONSTRAINT "Addendum_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addendum" ADD CONSTRAINT "Addendum_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "IntegrityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addendum" ADD CONSTRAINT "Addendum_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReceipt" ADD CONSTRAINT "DocumentReceipt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReceipt" ADD CONSTRAINT "DocumentReceipt_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "IntegrityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReceipt" ADD CONSTRAINT "DocumentReceipt_recipientPartyId_fkey" FOREIGN KEY ("recipientPartyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReceipt" ADD CONSTRAINT "DocumentReceipt_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "IntegrityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyFlag" ADD CONSTRAINT "AnomalyFlag_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDeadline" ADD CONSTRAINT "CaseDeadline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Append-only: AuditLog dan IntegrityRecord tidak boleh diubah/dihapus oleh siapa pun,
-- termasuk aplikasi. Cegah manipulasi jejak di level database.
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Tabel % bersifat append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_mutation
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER integrity_record_no_mutation
  BEFORE UPDATE OR DELETE ON "IntegrityRecord"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
