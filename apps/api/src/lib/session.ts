import type { AcademicSession } from '@prisma/client';
import { prisma } from './prisma.js';
import { notFound, serverError } from './response.js';

export type SessionInfo = AcademicSession;

export async function getCurrentSession(): Promise<SessionInfo | null> {
  const session = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  return session;
}

export async function requireCurrentSession(): Promise<
  { ok: true; session: SessionInfo } | { ok: false; response: Response }
> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, response: notFound('No current academic session set') };
  }
  return { ok: true, session };
}

export function handlePrismaNotFound(err: unknown): Response {
  const code = (err as { code?: string } | null)?.code;
  if (code === 'P2025') {
    return notFound();
  }
  console.error('Prisma error:', err);
  return serverError();
}
