-- CreateEnum
CREATE TYPE "HearingStage" AS ENUM ('PERSIANGAN', 'PEMBUKTIAN', 'PEMBAHASAN', 'PUTUSAN');

-- CreateEnum
CREATE TYPE "SlaStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'BREACHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PostponementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('H7', 'H3', 'H1');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AnomalyType" ADD VALUE 'SLA_BREACH';
ALTER TYPE "AnomalyType" ADD VALUE 'UNJUSTIFIED_POSTPONEMENT';

-- DropIndex
DROP INDEX "Article_embedding_idx";

-- DropIndex
DROP INDEX "Article_searchVector_idx";

-- DropIndex
DROP INDEX "Jurisprudence_embedding_idx";

-- DropIndex
DROP INDEX "Jurisprudence_searchVector_idx";

-- DropIndex
DROP INDEX "Regulation_searchVector_idx";

-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "searchVector" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Jurisprudence" ALTER COLUMN "searchVector" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Regulation" ADD COLUMN     "embedding" vector(1536),
ALTER COLUMN "searchVector" DROP DEFAULT;

-- CreateTable
CREATE TABLE "HearingSla" (
    "id" UUID NOT NULL,
    "hearingId" UUID NOT NULL,
    "stage" "HearingStage" NOT NULL,
    "label" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" "SlaStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HearingSla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaAlert" (
    "id" UUID NOT NULL,
    "slaTimerId" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "SlaAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postponement" (
    "id" UUID NOT NULL,
    "hearingId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedById" UUID,
    "approvedById" UUID,
    "status" "PostponementStatus" NOT NULL DEFAULT 'PENDING',
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "newStartsAt" TIMESTAMP(3),
    "newEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postponement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL,
    "hearingId" UUID NOT NULL,
    "type" "ReminderType" NOT NULL,
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'push',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HearingSla_hearingId_idx" ON "HearingSla"("hearingId");

-- CreateIndex
CREATE INDEX "HearingSla_status_idx" ON "HearingSla"("status");

-- CreateIndex
CREATE INDEX "HearingSla_deadlineAt_idx" ON "HearingSla"("deadlineAt");

-- CreateIndex
CREATE INDEX "SlaAlert_slaTimerId_idx" ON "SlaAlert"("slaTimerId");

-- CreateIndex
CREATE INDEX "SlaAlert_level_idx" ON "SlaAlert"("level");

-- CreateIndex
CREATE INDEX "Postponement_hearingId_idx" ON "Postponement"("hearingId");

-- CreateIndex
CREATE INDEX "Postponement_status_idx" ON "Postponement"("status");

-- CreateIndex
CREATE INDEX "Reminder_hearingId_idx" ON "Reminder"("hearingId");

-- CreateIndex
CREATE INDEX "Reminder_type_idx" ON "Reminder"("type");

-- CreateIndex
CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");

-- AddForeignKey
ALTER TABLE "HearingSla" ADD CONSTRAINT "HearingSla_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaAlert" ADD CONSTRAINT "SlaAlert_slaTimerId_fkey" FOREIGN KEY ("slaTimerId") REFERENCES "HearingSla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postponement" ADD CONSTRAINT "Postponement_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postponement" ADD CONSTRAINT "Postponement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postponement" ADD CONSTRAINT "Postponement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
