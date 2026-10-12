-- Migrasi 9: F6 - Jadwal Sidang & Anti-Molor

-- CreateEnum
CREATE TYPE "PostponementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Courtroom" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" TEXT,
    "capacity" INTEGER,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "JudgeSchedule" (
    "id" UUID NOT NULL PRIMARY KEY,
    "judgeName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "courtroomId" UUID,
    "caseId" UUID,
    "assignedToUserId" UUID,
    "assignedToId" UUID,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudgeSchedule_courtroomId_fkey" FOREIGN KEY ("courtroomId") REFERENCES "Courtroom"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JudgeSchedule_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JudgeSchedule_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Postponement" (
    "id" UUID NOT NULL PRIMARY KEY,
    "hearingId" UUID NOT NULL,
    "reason" TEXT,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "status" "PostponementStatus" NOT NULL DEFAULT 'PENDING',
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postponement_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "Postponement_status_fkey" FOREIGN KEY ("status") REFERENCES "PostponementStatus"("status") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL PRIMARY KEY,
    "hearingId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT FALSE,
    "deliveryMethod" TEXT, // "email", "whatsapp", "push", "sms"
    "deliveryStatus" TEXT, // "pending", "sent", "failed"
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_hearingId_fkey" FOREIGN KEY ("hearingId") REFERENCES "Hearing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Update model Hearing: tambah field untuk sinkronisasi kalender (sudah ada di schema, hanya menambahkan index/constraint jika perlu)
-- Index sudah ada dari schema lama, lewati atau tambah jika perlu:

-- CreateIndex
CREATE INDEX "Hearing_courtroom_startsAt_endsAt_idx" ON "Hearing"("courtroom", "startsAt", "endsAt");

CREATE INDEX "Hearing_judgeName_startsAt_endsAt_idx" ON "Hearing"("judgeName", "startsAt", "endsAt");

-- AddForeignKey untuk Hearing ke Case (sudah ada dari schema lama)
ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")
VALUES ('9f8e7d6c-5b4a-3c2d-1e0f-8b9a7c6d5e4f', 'manual_migration_f6', '9_f6_hearing_schedule', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1);
