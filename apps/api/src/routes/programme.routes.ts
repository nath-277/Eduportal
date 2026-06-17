import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { badRequest, conflict, notFound, ok } from '../lib/response.js';
import {
  createProgrammeSchema,
  updateProgrammeSchema,
  listProgrammesSchema,
  type CreateProgrammeInput,
  type UpdateProgrammeInput,
  type ListProgrammesQuery,
} from '../validators/programme.validator.js';

const programmeRouter = new Hono();

// GET /api/programmes - List all programmes (optionally filtered by departmentId)
programmeRouter.get('/', async (c) => {
  let query: ListProgrammesQuery;
  try {
    query = listProgrammesSchema.parse({
      departmentId: c.req.query('departmentId'),
    });
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const where: Record<string, unknown> = {};
  if (query.departmentId) where.departmentId = query.departmentId;

  const programmes = await prisma.programme.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { department: true },
  });

  return ok(programmes);
});

// GET /api/programmes/:id - Get specific programme details
programmeRouter.get('/:id', async (c) => {
  const { id } = c.req.param();

  const programme = await prisma.programme.findUnique({
    where: { id },
    include: { department: true },
  });

  if (!programme) return notFound('Programme not found');

  return ok(programme);
});

// POST /api/programmes - Create a new programme (Admin only)
programmeRouter.post('/', authenticate, authorize('ADMIN'), async (c) => {
  let body: CreateProgrammeInput;
  try {
    body = createProgrammeSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  // Check if department exists
  const dept = await prisma.department.findUnique({
    where: { id: body.departmentId },
  });
  if (!dept) return badRequest('Invalid departmentId');

  // Check unique constraints
  const existing = await prisma.programme.findFirst({
    where: { OR: [{ name: body.name }, { code: body.code }] },
  });
  if (existing) {
    return conflict('Programme with that name or code already exists');
  }

  const programme = await prisma.programme.create({
    data: {
      name: body.name,
      code: body.code.toUpperCase(),
      description: body.description,
      departmentId: body.departmentId,
    },
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'PROGRAMME_CREATE',
    entity: 'Programme',
    entityId: programme.id,
  });

  return c.json({ success: true, data: programme }, 201);
});

// PATCH /api/programmes/:id - Update programme details (Admin only)
programmeRouter.patch('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  let body: UpdateProgrammeInput;
  try {
    body = updateProgrammeSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existing = await prisma.programme.findUnique({ where: { id } });
  if (!existing) return notFound('Programme not found');

  if (body.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: body.departmentId } });
    if (!dept) return badRequest('Invalid departmentId');
  }

  if (body.code) {
    body.code = body.code.toUpperCase();
  }

  const programme = await prisma.programme.update({
    where: { id },
    data: body,
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'PROGRAMME_UPDATE',
    entity: 'Programme',
    entityId: id,
    metadata: { fields: Object.keys(body) },
  });

  return ok({ programme });
});

// DELETE /api/programmes/:id - Delete a programme (Admin only)
programmeRouter.delete('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.programme.findUnique({ where: { id } });
  if (!existing) return notFound('Programme not found');

  const userCount = await prisma.user.count({ where: { programmeId: id } });
  if (userCount > 0) {
    return badRequest('Cannot delete a programme that has users linked');
  }

  const courseCount = await prisma.course.count({ where: { programmeId: id } });
  if (courseCount > 0) {
    return badRequest('Cannot delete a programme that has courses linked');
  }

  await prisma.programme.delete({ where: { id } });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'PROGRAMME_DELETE',
    entity: 'Programme',
    entityId: id,
  });

  return ok({ message: 'Programme deleted' });
});

export default programmeRouter;
