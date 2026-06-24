import { createMiddleware } from 'hono/factory';
import type { UserRole } from '@prisma/client';
import type { ApiResponse } from '@eduportal/shared';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

const BEARER_PREFIX = 'Bearer ';

function unauthorized(message: string): Response {
  const body: ApiResponse<null> = { success: false, message };
  return new Response(JSON.stringify(body), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

function forbidden(message: string): Response {
  const body: ApiResponse<null> = { success: false, message };
  return new Response(JSON.stringify(body), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  });
}

export const authenticate = createMiddleware(async (c, next) => {
  const header = c.req.header('authorization');
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (token === '') {
    return unauthorized('Missing bearer token');
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return unauthorized('Invalid or expired token');
    }
    c.set('user', { userId: payload.userId, role: payload.role });
    await next();
  } catch (_error) {
    return unauthorized('Invalid or expired token');
  }
});

export function authorize(...allowedRoles: UserRole[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return unauthorized('Authentication required');
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return forbidden('Insufficient permissions');
    }
    await next();
  });
}
