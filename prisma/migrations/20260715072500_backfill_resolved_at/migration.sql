-- Backfill resolvedAt for tickets that were already RESOLVED before this column was added.
-- Uses updatedAt as a best-effort proxy for when they were resolved.
UPDATE "Ticket"
SET "resolvedAt" = "updatedAt"
WHERE "status" = 'RESOLVED'
  AND "resolvedAt" IS NULL;
