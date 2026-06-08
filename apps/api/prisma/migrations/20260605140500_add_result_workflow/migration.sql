-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Result"
  ADD COLUMN "status" "ResultStatus" NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "publishedById" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill: rows already published become PUBLISHED with publishedAt = updatedAt
UPDATE "Result"
SET
  "status" = 'PUBLISHED'::"ResultStatus",
  "publishedAt" = "updatedAt"
WHERE "isPublished" = true;

-- Backfill: rows that were never published stay SUBMITTED (default)

-- CreateIndex
CREATE INDEX "Result_status_idx" ON "Result"("status");

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_publishedById_fkey"
  FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
