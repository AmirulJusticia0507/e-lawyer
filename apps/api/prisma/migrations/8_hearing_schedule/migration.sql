CREATE TYPE "HearingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'POSTPONED', 'CANCELLED');

CREATE TABLE "Hearing" (
    "id" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "courtroom" TEXT NOT NULL,
    "judgeName" TEXT NOT NULL,
    "status" "HearingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Hearing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Hearing_startsAt_endsAt_status_idx" ON "Hearing"("startsAt", "endsAt", "status");
CREATE INDEX "Hearing_courtroom_startsAt_endsAt_idx" ON "Hearing"("courtroom", "startsAt", "endsAt");
CREATE INDEX "Hearing_judgeName_startsAt_endsAt_idx" ON "Hearing"("judgeName", "startsAt", "endsAt");
CREATE INDEX "Hearing_caseId_startsAt_idx" ON "Hearing"("caseId", "startsAt");

ALTER TABLE "Hearing"
    ADD CONSTRAINT "Hearing_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Hearing"
    ADD CONSTRAINT "Hearing_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
