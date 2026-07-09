-- This migration was applied directly to the database (drift detected).
-- Stub created to reconcile local migration history with the live database.
-- Original migration added: workDone column on Ticket, searchVector tsvector
-- generated column, Account/Session/VerificationToken tables, and made
-- User.name/email/password nullable.

-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "name"     DROP NOT NULL,
  ALTER COLUMN "email"    DROP NOT NULL,
  ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image"         TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "workDone"     TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Ticket_createdById_idx"       ON "Ticket"("createdById");
CREATE INDEX IF NOT EXISTS "Ticket_assignedToId_idx"      ON "Ticket"("assignedToId");
CREATE INDEX IF NOT EXISTS "Ticket_status_priority_idx"   ON "Ticket"("status", "priority");
CREATE INDEX IF NOT EXISTS "Comment_ticketId_idx"         ON "Comment"("ticketId");
CREATE INDEX IF NOT EXISTS "Comment_authorId_idx"         ON "Comment"("authorId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"        ON "User"("email");

-- CreateTable: Account
CREATE TABLE IF NOT EXISTS "Account" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "type"              TEXT NOT NULL,
    "provider"          TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token"     TEXT,
    "access_token"      TEXT,
    "expires_at"        INTEGER,
    "token_type"        TEXT,
    "scope"             TEXT,
    "id_token"          TEXT,
    "session_state"     TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Session
CREATE TABLE IF NOT EXISTS "Session" (
    "id"           TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "expires"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: VerificationToken
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token"      TEXT NOT NULL,
    "expires"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key"            ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
