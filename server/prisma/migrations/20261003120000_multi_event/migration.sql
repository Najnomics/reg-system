-- Multi-event support.
-- Every existing member, session, chapel and chariot is moved into the
-- "Homecoming" event, which is the only event that has chariots.
-- Safe to re-run: each step checks whether it was already applied.

CREATE TABLE IF NOT EXISTS "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "hasChariots" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_key" ON "events"("slug");

INSERT INTO "events" ("id", "name", "slug", "description", "venue", "startDate", "endDate", "hasChariots", "isActive", "createdAt", "updatedAt")
VALUES (
    'homecoming',
    'Homecoming',
    'homecoming',
    'HomeComing Conference 2026 - Territorial Commanders',
    'Balm of Gilead City',
    '2026-01-28 00:00:00',
    '2026-02-01 23:59:59',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- members
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "eventId" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "phone" TEXT;
UPDATE "members" SET "eventId" = 'homecoming' WHERE "eventId" IS NULL;
ALTER TABLE "members" ALTER COLUMN "eventId" SET NOT NULL;

-- sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "eventId" TEXT;
UPDATE "sessions" SET "eventId" = 'homecoming' WHERE "eventId" IS NULL;
ALTER TABLE "sessions" ALTER COLUMN "eventId" SET NOT NULL;

-- chapels
ALTER TABLE "chapels" ADD COLUMN IF NOT EXISTS "eventId" TEXT;
UPDATE "chapels" SET "eventId" = 'homecoming' WHERE "eventId" IS NULL;
ALTER TABLE "chapels" ALTER COLUMN "eventId" SET NOT NULL;

-- chariots
ALTER TABLE "chariots" ADD COLUMN IF NOT EXISTS "eventId" TEXT;
UPDATE "chariots" SET "eventId" = 'homecoming' WHERE "eventId" IS NULL;
ALTER TABLE "chariots" ALTER COLUMN "eventId" SET NOT NULL;

-- Names and PINs become unique per event instead of across the whole system.
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_name_key";
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_pin_key";
DROP INDEX IF EXISTS "members_name_key";
DROP INDEX IF EXISTS "members_pin_key";
CREATE UNIQUE INDEX IF NOT EXISTS "members_eventId_name_key" ON "members"("eventId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "members_eventId_pin_key" ON "members"("eventId", "pin");

CREATE INDEX IF NOT EXISTS "members_eventId_idx" ON "members"("eventId");
CREATE INDEX IF NOT EXISTS "sessions_eventId_idx" ON "sessions"("eventId");
CREATE INDEX IF NOT EXISTS "chapels_eventId_idx" ON "chapels"("eventId");
CREATE INDEX IF NOT EXISTS "chariots_eventId_idx" ON "chariots"("eventId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_eventId_fkey') THEN
        ALTER TABLE "members" ADD CONSTRAINT "members_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_eventId_fkey') THEN
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chapels_eventId_fkey') THEN
        ALTER TABLE "chapels" ADD CONSTRAINT "chapels_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chariots_eventId_fkey') THEN
        ALTER TABLE "chariots" ADD CONSTRAINT "chariots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
