-- Add indexes for frequently queried fields to improve performance

-- Index for member search queries
CREATE INDEX IF NOT EXISTS "idx_members_name" ON "members"("name");
CREATE INDEX IF NOT EXISTS "idx_members_email" ON "members"("email");
CREATE INDEX IF NOT EXISTS "idx_members_isactive" ON "members"("isActive");
CREATE INDEX IF NOT EXISTS "idx_members_createdat" ON "members"("createdAt");

-- Index for attendance queries
CREATE INDEX IF NOT EXISTS "idx_attendances_sessionid" ON "attendances"("sessionId");
CREATE INDEX IF NOT EXISTS "idx_attendances_memberid" ON "attendances"("memberId");
CREATE INDEX IF NOT EXISTS "idx_attendances_checkedinat" ON "attendances"("checkedInAt");

-- Index for session queries
CREATE INDEX IF NOT EXISTS "idx_sessions_starttime" ON "sessions"("startTime");
CREATE INDEX IF NOT EXISTS "idx_sessions_endtime" ON "sessions"("endTime");
CREATE INDEX IF NOT EXISTS "idx_sessions_isactive" ON "sessions"("isActive");

-- Index for chariot queries
CREATE INDEX IF NOT EXISTS "idx_chariots_leaderid" ON "chariots"("leaderId");
CREATE INDEX IF NOT EXISTS "idx_chariots_isactive" ON "chariots"("isActive");
CREATE INDEX IF NOT EXISTS "idx_chariot_assistants_chariotid" ON "chariot_assistants"("chariotId");
CREATE INDEX IF NOT EXISTS "idx_chariot_assistants_memberid" ON "chariot_assistants"("memberId");
CREATE INDEX IF NOT EXISTS "idx_chariot_members_chariotid" ON "chariot_members"("chariotId");
CREATE INDEX IF NOT EXISTS "idx_chariot_members_memberid" ON "chariot_members"("memberId");
