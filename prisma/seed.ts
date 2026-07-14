import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const projects = [
    'TFSIN',
    'KBL MQ',
    'TMB',
    'SONY',
    'SIB',
    'OGB',
    'CUB',
    'CSB',
    'IOB',
    'JANABANK',
    'BACL',
    'BOBCARD',
    'IndusInd',
    'BOM',
  ];

  console.log("Upserting Projects...");
  for (const name of projects) {
    await prisma.project.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const backupPath = path.join(__dirname, '../backup/old-data.json');
  if (fs.existsSync(backupPath)) {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const { users, tickets } = backupData;

    console.log(`Upserting ${users?.length || 0} Users...`);
    for (const user of users || []) {
      if (user.email) {
        const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (existingUser && existingUser.id !== user.id) {
          console.log(`Deleting conflicting user for email ${user.email} (id mismatch)`);
          await prisma.user.delete({ where: { email: user.email } });
        }
      }

      const role = user.email === 'ticketingsystemadmin@gmail.com' ? 'ADMIN' : user.role;
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          name: user.name,
          email: user.email,
          role,
          password: user.password,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
          password: user.password,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        },
      });
    }

    console.log(`Upserting ${tickets?.length || 0} Tickets...`);
    for (const ticket of tickets || []) {
      await prisma.ticket.upsert({
        where: { id: ticket.id },
        update: {
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          createdById: ticket.createdById,
          assignedToId: ticket.assignedToId,
          resolution: ticket.resolution || null,
          createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
          updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(),
          projectId: null,
          contactEmail: null,
        },
        create: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          createdById: ticket.createdById,
          assignedToId: ticket.assignedToId,
          resolution: ticket.resolution || null,
          createdAt: ticket.createdAt ? new Date(ticket.createdAt) : new Date(),
          updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(),
          projectId: null,
          contactEmail: null,
        },
      });
    }
  } else {
    console.warn("No backup/old-data.json found. Skipping legacy data import.");
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
