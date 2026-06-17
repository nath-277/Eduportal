import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Prisma, TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';
import { notFound, ok, forbidden } from '../lib/response.js';
import { writeAudit } from '../lib/audit.js';
import {
  createTicketSchema,
  updateTicketSchema,
  createCommentSchema,
} from '../validators/support.validator.js';

const supportRouter = new Hono();

// 1. Get tickets list (Students/Lecturers see their own; Admin sees all with filters)
supportRouter.get('/tickets', authenticate, async (c) => {
  const user = c.get('user');
  const role = user.role;

  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const category = c.req.query('category');

  const whereClause: Prisma.SupportTicketWhereInput = {};

  if (role !== 'ADMIN') {
    whereClause.userId = user.userId;
  } else {
    if (status) whereClause.status = status as TicketStatus;
    if (priority) whereClause.priority = priority as TicketPriority;
    if (category) whereClause.category = category as TicketCategory;
  }

  const tickets = await prisma.supportTicket.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, fullname: true, email: true, role: true, matricNumber: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ tickets });
});

// 2. Get ticket details with comments thread
supportRouter.get('/tickets/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullname: true, email: true, role: true, matricNumber: true } },
      comments: {
        include: {
          user: { select: { id: true, fullname: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) {
    return notFound('Ticket not found');
  }

  // Ensure owner or admin
  if (user.role !== 'ADMIN' && ticket.userId !== user.userId) {
    return forbidden('You do not have permission to view this ticket');
  }

  return ok({ ticket });
});

// 3. Create a ticket
supportRouter.post('/tickets', authenticate, async (c) => {
  const user = c.get('user');
  let body;
  try {
    body = createTicketSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.userId,
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority,
      metadata: (body.metadata || {}) as Prisma.InputJsonValue,
    },
  });

  await writeAudit(c, {
    userId: user.userId,
    action: 'TICKET_CREATE',
    entity: 'SupportTicket',
    entityId: ticket.id,
    metadata: { title: ticket.title, category: ticket.category },
  });

  return ok({ ticket });
});

// 4. Post comment to ticket
supportRouter.post('/tickets/:id/comments', authenticate, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  let body;
  try {
    body = createCommentSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    return notFound('Ticket not found');
  }

  if (user.role !== 'ADMIN' && ticket.userId !== user.userId) {
    return forbidden('You do not have permission to comment on this ticket');
  }

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: id,
      userId: user.userId,
      content: body.content,
    },
    include: {
      user: { select: { id: true, fullname: true, email: true, role: true } },
    },
  });

  // Notify student if comment is from admin
  if (user.role === 'ADMIN' && ticket.userId !== user.userId) {
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        category: 'SYSTEM',
        title: 'New reply to support ticket',
        message: `An administrator has replied to your support ticket: "${ticket.title}".`,
        link: `/support/tickets/${id}`,
      },
    });
  }

  await writeAudit(c, {
    userId: user.userId,
    action: 'TICKET_COMMENT_CREATE',
    entity: 'TicketComment',
    entityId: comment.id,
  });

  return ok({ comment });
});

// 5. Update status or priority (Admin only)
supportRouter.patch('/tickets/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  let body;
  try {
    body = updateTicketSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    return notFound('Ticket not found');
  }

  const data: Prisma.SupportTicketUpdateInput = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;

  const updated = await prisma.supportTicket.update({
    where: { id },
    data,
  });

  // Notify user if resolved
  if (body.status === 'RESOLVED' && ticket.status !== 'RESOLVED') {
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        category: 'SYSTEM',
        title: 'Support ticket resolved',
        message: `Your support ticket: "${ticket.title}" has been marked as resolved by the administrator.`,
        link: `/support/tickets/${id}`,
      },
    });
  }

  await writeAudit(c, {
    userId: user.userId,
    action: 'TICKET_UPDATE',
    entity: 'SupportTicket',
    entityId: id,
    metadata: data,
  });

  return ok({ ticket: updated });
});

export default supportRouter;
