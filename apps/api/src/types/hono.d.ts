import type { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

export type HandleZodError = (error: unknown) => Response;

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthenticatedUser;
    handleZodError: HandleZodError;
  }
}

export {};
