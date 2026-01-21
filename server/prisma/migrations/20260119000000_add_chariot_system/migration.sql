-- CreateTable
CREATE TABLE IF NOT EXISTS "chariots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "chariots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chariot_assistants" (
    "id" TEXT NOT NULL,
    "chariotId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chariot_assistants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chariot_members" (
    "id" TEXT NOT NULL,
    "chariotId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chariot_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chariot_assistants_chariotId_memberId_key" ON "chariot_assistants"("chariotId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "chariot_members_chariotId_memberId_key" ON "chariot_members"("chariotId", "memberId");

-- AddForeignKey
ALTER TABLE "chariots" ADD CONSTRAINT "chariots_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chariots" ADD CONSTRAINT "chariots_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chariot_assistants" ADD CONSTRAINT "chariot_assistants_chariotId_fkey" FOREIGN KEY ("chariotId") REFERENCES "chariots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chariot_assistants" ADD CONSTRAINT "chariot_assistants_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chariot_members" ADD CONSTRAINT "chariot_members_chariotId_fkey" FOREIGN KEY ("chariotId") REFERENCES "chariots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chariot_members" ADD CONSTRAINT "chariot_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
