import { PrismaClient } from '@prisma/client';

const isProduction = process.env.NODE_ENV === 'production';

const basePrisma = new PrismaClient({
  log: isProduction ? ['error'] : ['query', 'error', 'warn'],
});

const extendedPrisma = basePrisma.$extends({
  query: {
    $allOperations({ model, operation, args, query }) {
      const maxRetries = 3;
      let delay = 500;

      const execute = async (attempt: number): Promise<unknown> => {
        try {
          return await query(args);
        } catch (error) {
          const err = error as Record<string, unknown> & { code?: string };
          const errorMessage = String(err?.message || '');
          const errorCode = String(err?.code || '');

          const isTransient =
            errorMessage.includes('timeout') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('pool') ||
            errorCode === 'P2024' || // Connection timeout
            errorCode === 'P2028' || // Transaction timeout
            errorCode === 'P2010';   // Raw query failed (e.g. connection closed)

          if (isTransient && attempt < maxRetries) {
            console.warn(
              `[Prisma] Transient DB error in ${
                model || 'operation'
              }.${operation} (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${delay}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            return execute(attempt + 1);
          }
          throw error;
        }
      };

      return execute(1);
    },
  },
});

declare global {
  var __prisma: typeof extendedPrisma | undefined;
}

export const prisma = global.__prisma ?? extendedPrisma;

if (!isProduction) {
  global.__prisma = prisma;
}
