-- Ensure chapels table has isActive column for current schema
ALTER TABLE "chapels" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Optional index for isActive filtering
CREATE INDEX IF NOT EXISTS "chapels_isActive_idx" ON "chapels"("isActive");
