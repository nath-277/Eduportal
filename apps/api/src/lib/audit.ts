import type { Context } from 'hono';
import { prisma } from './prisma.js';

export async function writeAudit(
  c: Context,
  opts: {
    userId: string;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: opts.userId,
      action: opts.action,
      entity: opts.entity ?? null,
      entityId: opts.entityId ?? null,
      metadata: opts.metadata ? JSON.parse(JSON.stringify(opts.metadata)) : undefined,
      ipAddress: c.req.header('x-forwarded-for') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
    },
  });
}
