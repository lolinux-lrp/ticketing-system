-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "AttendeeStatus" AS ENUM ('ACCEPTED', 'DECLINED', 'PENDING', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Meeting" (
    "id"                    TEXT NOT NULL,
    "title"                 TEXT NOT NULL,
    "description"           TEXT,
    "startTime"             TIMESTAMP(3) NOT NULL,
    "endTime"               TIMESTAMP(3) NOT NULL,
    "meetingUrl"            TEXT NOT NULL,
    "externalGoogleEventId" TEXT,
    "ticketId"              TEXT,
    "createdById"           TEXT NOT NULL,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MeetingAttendee" (
    "id"        TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "status"    "AttendeeStatus" NOT NULL DEFAULT 'ACCEPTED',

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Meeting_ticketId_idx"        ON "Meeting"("ticketId");
CREATE INDEX IF NOT EXISTS "Meeting_createdById_idx"     ON "Meeting"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");
CREATE INDEX IF NOT EXISTS "MeetingAttendee_meetingId_idx" ON "MeetingAttendee"("meetingId");
CREATE INDEX IF NOT EXISTS "MeetingAttendee_userId_idx"    ON "MeetingAttendee"("userId");

-- AddForeignKey (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey"
      FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
