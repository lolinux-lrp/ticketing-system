import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. Create a direct connection pool to your Postgres database
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Wrap that pool in Prisma's official adapter
const adapter = new PrismaPg(pool);

// 3. The Next.js hot-reloading workaround (same as before)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 4. Initialize Prisma, but this time we MUST pass the adapter inside the options
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;