CREATE TABLE "booklet_sends" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booklet_sends_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booklet_sends_memberId_eventId_key" ON "booklet_sends"("memberId", "eventId");
CREATE INDEX "booklet_sends_eventId_idx" ON "booklet_sends"("eventId");
CREATE INDEX "booklet_sends_sentAt_idx" ON "booklet_sends"("sentAt");

ALTER TABLE "booklet_sends" ADD CONSTRAINT "booklet_sends_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booklet_sends" ADD CONSTRAINT "booklet_sends_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
