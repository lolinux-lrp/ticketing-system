-- Fix drift: ensure projectId index exists (already present in DB, recorded here for history)
CREATE INDEX IF NOT EXISTS "Ticket_projectId_idx" ON "Ticket"("projectId");

-- Add resolvedAt column to Ticket
ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3);
