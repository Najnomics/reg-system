-- Rows inserted without an event (e.g. by a deployment that predates multi-event
-- support) land in Homecoming instead of failing the NOT NULL constraint.
-- The application always sets eventId explicitly; this is only a safety net.
ALTER TABLE "members" ALTER COLUMN "eventId" SET DEFAULT 'homecoming';
ALTER TABLE "sessions" ALTER COLUMN "eventId" SET DEFAULT 'homecoming';
ALTER TABLE "chapels" ALTER COLUMN "eventId" SET DEFAULT 'homecoming';
ALTER TABLE "chariots" ALTER COLUMN "eventId" SET DEFAULT 'homecoming';
