import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { notFound, ok } from '../lib/response.js';

const notificationRouter = new Hono();

notificationRouter.get('/mine', authenticate, async (c) => {
  const { userId } = c.get('user');
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return ok({ unreadCount, notifications });
});

notificationRouter.patch('/:id/read', authenticate, async (c) => {
  const { id } = c.req.param();
  const { userId } = c.get('user');

  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) return notFound('Notification not found');
  if (existing.userId !== userId) return notFound('Notification not found');

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return ok({ notification: updated });
});

notificationRouter.patch('/read-all', authenticate, async (c) => {
  const { userId } = c.get('user');
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return ok({ updated: result.count });
});

export default notificationRouter;
