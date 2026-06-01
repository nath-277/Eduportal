import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { badRequest, forbidden, notFound, ok } from '../lib/response.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from '../validators/announcement.validator.js';

const announcementRouter = new Hono();

announcementRouter.get('/', authenticate, async (c) => {
  const current = c.get('user');
  const now = new Date();

  const announcements = await prisma.announcement.findMany({
    where: {
      AND: [
        {
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        },
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        {
          OR: [{ targetRole: null }, { targetRole: current.role }],
        },
      ],
    },
    include: { author: { select: { id: true, fullname: true, avatarUrl: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });

  return ok(announcements);
});

announcementRouter.post('/', authenticate, authorize('LECTURER', 'ADMIN'), async (c) => {
  let body: CreateAnnouncementInput;
  try {
    body = createAnnouncementSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  if (body.scheduledAt && body.expiresAt && new Date(body.scheduledAt) >= new Date(body.expiresAt)) {
    return badRequest('scheduledAt must be before expiresAt');
  }

  const current = c.get('user');
  const announcement = await prisma.announcement.create({
    data: {
      title: body.title,
      body: body.body,
      isPinned: body.isPinned,
      targetRole: body.targetRole ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      authorId: current.userId,
    },
  });

  const targetUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(body.targetRole ? { role: body.targetRole } : {}),
    },
    select: { id: true },
  });

  if (targetUsers.length > 0) {
    await prisma.notification.createMany({
      data: targetUsers.map((u) => ({
        userId: u.id,
        category: 'ANNOUNCEMENT',
        title: body.title,
        message: body.body.slice(0, 200),
        link: `/announcements/${announcement.id}`,
      })),
    });
  }

  await writeAudit(c, {
    userId: current.userId,
    action: 'ANNOUNCEMENT_CREATE',
    entity: 'Announcement',
    entityId: announcement.id,
    metadata: { targetRole: body.targetRole, notified: targetUsers.length },
  });

  return c.json({ success: true, data: announcement, notified: targetUsers.length }, 201);
});

announcementRouter.patch('/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  let body: UpdateAnnouncementInput;
  try {
    body = updateAnnouncementSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return notFound('Announcement not found');

  const current = c.get('user');
  if (current.role !== 'ADMIN' && existing.authorId !== current.userId) {
    return forbidden('You can only edit your own announcements');
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.body !== undefined) data.body = body.body;
  if (body.isPinned !== undefined) data.isPinned = body.isPinned;
  if (body.targetRole !== undefined) data.targetRole = body.targetRole;
  if (body.scheduledAt !== undefined) {
    data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  }
  if (body.expiresAt !== undefined) {
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }

  const updated = await prisma.announcement.update({ where: { id }, data });

  await writeAudit(c, {
    userId: current.userId,
    action: 'ANNOUNCEMENT_UPDATE',
    entity: 'Announcement',
    entityId: id,
    metadata: { fields: Object.keys(body) },
  });

  return ok({ announcement: updated });
});

announcementRouter.delete('/:id', authenticate, async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return notFound('Announcement not found');

  const current = c.get('user');
  if (current.role !== 'ADMIN' && existing.authorId !== current.userId) {
    return forbidden('You can only delete your own announcements');
  }

  await prisma.announcement.delete({ where: { id } });

  await writeAudit(c, {
    userId: current.userId,
    action: 'ANNOUNCEMENT_DELETE',
    entity: 'Announcement',
    entityId: id,
  });

  return ok({ message: 'Announcement deleted' });
});

export default announcementRouter;
