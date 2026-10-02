import { PrismaClient } from '@prisma/client';

const globalDatabase = globalThis as unknown as {
  wakeOpsPrisma?: PrismaClient;
};

export const database = globalDatabase.wakeOpsPrisma ?? new PrismaClient();

globalDatabase.wakeOpsPrisma = database;

export { MembershipRole, Prisma, PrismaClient } from '@prisma/client';
