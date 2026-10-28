-- The sub-leader value is already on the database. This records the migration
-- without altering an enum inside Prisma's transaction, which was holding startup.
SELECT 1;
