-- Migration: Allow duplicate emails for members
-- This migration removes the unique constraint on the email column
-- Multiple members can now have the same email but different names

-- Drop the unique index on email
DROP INDEX IF EXISTS "members_email_key";

-- Note: The email column will still be indexed for performance (non-unique index)
-- This allows fast lookups while permitting duplicates
