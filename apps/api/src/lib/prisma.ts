import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
  });

if (!isProduction) {
  global.__prisma = prisma;
}
