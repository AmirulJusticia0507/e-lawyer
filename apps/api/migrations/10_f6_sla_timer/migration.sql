-- Migrasi 10: F6 - SLA Timer, Postponement Flow, Reminder

-- CreateEnum
CREATE TYPE "HearingStage" AS ENUM ('PERSIANGAN', 'PEMBUKTIAN', 'PEMBAHASAN', 'PUTUSAN');
CREATE TYPE "SlaStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'BREACHED', 'COMPLETED');
CREATE TYPE "ReminderType" AS ENUM ('H7', 'H3', 'H1');
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterEnum: tambah AnomalyType untuk SLA
ALTER TYPE "AnomalyType" ADD VALUE IF NOT EXISTS 'SLA_BREACH';
ALTER TYPE "AnomalyType" ADD VALUE IF NOT EXISTS 'UNJUSTIFIED_POSTPONEMENT';

-- CreateTable: HearingSla
CREATE TABLE "HearingSla" (
    "id" UUID NOT NULL PRIMARY KEY,
    "hearingId" UUID NOT NULL,
    "stage" "HearingStage" NOT NULL,
    "label" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" "SlaStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HearingSla_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: SlaAlert
CREATE TABLE "SlaAlert" (
    "id" UUID NOT NULL PRIMARY KEY,
    "slaTimerId" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "SlaAlert_slaTimerId_fkey" FOREIGN KEY ("slaTimerId") REFERENCES "HearingSla"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Postponement
CREATE TABLE "Postponement" (
    "id" UUID NOT NULL PRIMARY KEY,
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

    CONSTRAINT "Postponement_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Postponement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Postponement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: Reminder
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL PRIMARY KEY,
    "hearingId" UUID NOT NULL,
    "type" "ReminderType" NOT NULL,
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'push',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HearingSla_hearingId_idx" ON "HearingSla"("hearingId");
CREATE INDEX "HearingSla_status_idx" ON "HearingSla"("status");
CREATE INDEX "HearingSla_deadlineAt_idx" ON "HearingSla"("deadlineAt");
CREATE INDEX "SlaAlert_slaTimerId_idx" ON "SlaAlert"("slaTimerId");
CREATE INDEX "SlaAlert_level_idx" ON "SlaAlert"("level");
CREATE INDEX "Postponement_hearingId_idx" ON "Postponement"("hearingId");
CREATE INDEX "Postponement_status_idx" ON "Postponement"("status");
CREATE INDEX "Reminder_hearingId_idx" ON "Reminder"("hearingId");
CREATE INDEX "Reminder_type_idx" ON "Reminder"("type");
CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");
