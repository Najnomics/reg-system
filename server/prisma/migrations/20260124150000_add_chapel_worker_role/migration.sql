-- Add WORKER to ChapelRole enum
ALTER TYPE "ChapelRole" ADD VALUE IF NOT EXISTS 'WORKER';
