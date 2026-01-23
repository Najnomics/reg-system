-- CreateTable
CREATE TABLE "chapels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "chapels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chapels_name_key" ON "chapels"("name");

-- CreateIndex
CREATE INDEX "chapels_createdBy_idx" ON "chapels"("createdBy");

-- AlterTable
ALTER TABLE "members" ADD COLUMN "chapelId" TEXT;

-- CreateIndex
CREATE INDEX "members_chapelId_idx" ON "members"("chapelId");

-- AddForeignKey
ALTER TABLE "chapels" ADD CONSTRAINT "chapels_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_chapelId_fkey" FOREIGN KEY ("chapelId") REFERENCES "chapels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
