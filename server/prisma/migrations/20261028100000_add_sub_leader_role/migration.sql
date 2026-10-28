-- Sub-leaders are chapel leaders' assistants. They sign in the same way.
ALTER TYPE "ChapelRole" ADD VALUE IF NOT EXISTS 'SUB_LEADER';
