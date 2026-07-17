CREATE TYPE "Priority_new" AS ENUM ('P1', 'P2', 'P3', 'P4');
ALTER TABLE "Ticket" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "priority" TYPE "Priority_new" USING (
CASE "priority"::text
WHEN 'URGENT' THEN 'P1'::"Priority_new"
WHEN 'HIGH' THEN 'P2'::"Priority_new"
WHEN 'MEDIUM' THEN 'P3'::"Priority_new"
WHEN 'LOW' THEN 'P4'::"Priority_new"
ELSE 'P3'::"Priority_new"
END
);
ALTER TABLE "Ticket" ALTER COLUMN "priority" SET DEFAULT 'P3';
DROP TYPE "Priority";
ALTER TYPE "Priority_new" RENAME TO "Priority";
