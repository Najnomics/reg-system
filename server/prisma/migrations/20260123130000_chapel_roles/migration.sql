-- CreateEnum
CREATE TYPE "ChapelRole" AS ENUM ('INVITEE', 'MEMBER');

-- AlterTable
ALTER TABLE "members" ADD COLUMN "chapelId" TEXT;
ALTER TABLE "members" ADD COLUMN "chapelRole" "ChapelRole";

-- Drop chapel leader/subleader fields
ALTER TABLE "chapels" DROP CONSTRAINT IF EXISTS "chapels_leaderId_fkey";
ALTER TABLE "chapels" DROP CONSTRAINT IF EXISTS "chapels_subLeaderId_fkey";
DROP INDEX IF EXISTS "chapels_leaderId_idx";
DROP INDEX IF EXISTS "chapels_subLeaderId_idx";
ALTER TABLE "chapels" DROP COLUMN IF EXISTS "leaderId";
ALTER TABLE "chapels" DROP COLUMN IF EXISTS "subLeaderId";

-- Drop old join tables
DROP TABLE IF EXISTS "chapel_workers";
DROP TABLE IF EXISTS "chapel_members";

-- CreateIndex
CREATE INDEX "members_chapelId_idx" ON "members"("chapelId");
CREATE INDEX "members_chapelRole_idx" ON "members"("chapelRole");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_chapelId_fkey" FOREIGN KEY ("chapelId") REFERENCES "chapels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
