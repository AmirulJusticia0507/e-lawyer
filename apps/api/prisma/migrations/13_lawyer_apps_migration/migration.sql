-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AnomalyType" ADD VALUE 'SLA_BREACH';
ALTER TYPE "AnomalyType" ADD VALUE 'UNJUSTIFIED_POSTPONEMENT';

-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "searchVector" DROP EXPRESSION;

-- AlterTable
ALTER TABLE "Jurisprudence" ALTER COLUMN "searchVector" DROP EXPRESSION;

-- AlterTable
ALTER TABLE "PasswordResetToken" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Regulation" ADD COLUMN     "embedding" vector(1536),
ALTER COLUMN "searchVector" DROP EXPRESSION;

-- CreateTable
CREATE TABLE "Feedback" (
    "id" UUID NOT NULL,
    "caseId" UUID,
    "userId" UUID NOT NULL,
    "predictionType" TEXT NOT NULL,
    "predictedValue" TEXT NOT NULL,
    "actualOutcome" TEXT,
    "rating" INTEGER,
    "feedbackText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
