-- Migration: Add unique constraint on name field
-- This ensures that two persons cannot exist with the same name combination
-- Duplicate emails are still allowed, but names must be unique

-- First, check if there are any duplicate names and handle them
-- (This is a safety check - you may need to resolve duplicates manually)

-- Add unique constraint on name
-- Note: This will fail if duplicate names already exist in the database
-- If duplicates exist, you'll need to resolve them first

CREATE UNIQUE INDEX IF NOT EXISTS "members_name_key" ON "members"("name");

-- Note: If you get an error about duplicate names, you'll need to:
-- 1. Find duplicate names: SELECT name, COUNT(*) FROM members GROUP BY name HAVING COUNT(*) > 1;
-- 2. Update duplicate names to make them unique (e.g., add a suffix or update the name)
-- 3. Then re-run this migration
