import { PrismaClient } from '@prisma/client';

const globalDatabase = globalThis as unknown as {
  wakeOpsPrisma?: PrismaClient;
};

export const database = globalDatabase.wakeOpsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalDatabase.wakeOpsPrisma = database;
}

export { MembershipRole, Prisma, PrismaClient } from '@prisma/client';
