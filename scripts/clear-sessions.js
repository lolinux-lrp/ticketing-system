import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Make sure your .env file is present.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing all stale sessions and OAuth accounts...');

  const deletedSessions = await prisma.session.deleteMany();
  console.log(`✅ Deleted ${deletedSessions.count} sessions.`);

  const deletedAccounts = await prisma.account.deleteMany();
  console.log(`✅ Deleted ${deletedAccounts.count} OAuth accounts.`);

  console.log('Done! You can now resume testing from a clean state.');
}

main()
  .catch((e) => {
    console.error('Error clearing sessions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

