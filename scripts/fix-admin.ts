import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function run() {
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.updateMany({
    where: { email: 'admin@example.com' },
    data: { password: hash }
  });
  console.log('Successfully set password for admin@example.com to: password123');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
