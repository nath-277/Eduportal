import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { badRequest, conflict, notFound, ok } from '../lib/response.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createSessionSchema,
  updateSessionSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
  type CreateSessionInput,
  type UpdateSessionInput,
} from '../validators/department.validator.js';

const departmentRouter = new Hono();

departmentRouter.get('/', async (_c) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });
  return ok(departments);
});

departmentRouter.post('/', authenticate, authorize('ADMIN'), async (c) => {
  let body: CreateDepartmentInput;
  try {
    body = createDepartmentSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existing = await prisma.department.findFirst({
    where: { OR: [{ name: body.name }, { code: body.code }] },
  });
  if (existing) return conflict('Department with that name or code already exists');

  const dept = await prisma.department.create({
    data: {
      name: body.name,
      code: body.code,
      description: body.description,
      maxLevel: body.maxLevel,
    },
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'DEPARTMENT_CREATE',
    entity: 'Department',
    entityId: dept.id,
  });

  return c.json({ success: true, data: dept }, 201);
});

departmentRouter.patch('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  let body: UpdateDepartmentInput;
  try {
    body = updateDepartmentSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) return notFound('Department not found');

  const dept = await prisma.department.update({ where: { id }, data: body });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'DEPARTMENT_UPDATE',
    entity: 'Department',
    entityId: id,
    metadata: { fields: Object.keys(body) },
  });

  return ok({ department: dept });
});

departmentRouter.delete('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) return notFound('Department not found');

  const userCount = await prisma.user.count({ where: { departmentId: id } });
  if (userCount > 0) {
    return badRequest('Cannot delete a department that has users linked');
  }

  const courseCount = await prisma.course.count({ where: { departmentId: id } });
  if (courseCount > 0) {
    return badRequest('Cannot delete a department that has courses linked');
  }

  await prisma.department.delete({ where: { id } });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'DEPARTMENT_DELETE',
    entity: 'Department',
    entityId: id,
  });

  return ok({ message: 'Department deleted' });
});

const sessionRouter = new Hono();

sessionRouter.get('/', async (_c) => {
  const sessions = await prisma.academicSession.findMany({
    orderBy: { startDate: 'desc' },
  });
  return ok(sessions);
});

sessionRouter.post('/', authenticate, authorize('ADMIN'), async (c) => {
  let body: CreateSessionInput;
  try {
    body = createSessionSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existing = await prisma.academicSession.findUnique({ where: { name: body.name } });
  if (existing) return conflict('Session with that name already exists');

  const session = await prisma.academicSession.create({
    data: {
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      currentSemester: body.currentSemester || 'FIRST',
    },
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'SESSION_CREATE',
    entity: 'AcademicSession',
    entityId: session.id,
  });

  return c.json({ success: true, data: session }, 201);
});

sessionRouter.patch('/:id/set-current', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));
  const semester = body.currentSemester;

  const existing = await prisma.academicSession.findUnique({ where: { id } });
  if (!existing) return notFound('Session not found');

  await prisma.$transaction([
    prisma.academicSession.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.academicSession.update({
      where: { id },
      data: {
        isCurrent: true,
        currentSemester: semester ? semester : undefined,
      },
    }),
  ]);

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'SESSION_SET_CURRENT',
    entity: 'AcademicSession',
    entityId: id,
    metadata: { currentSemester: semester },
  });

  return ok({ message: `${existing.name} is now the current session` });
});

sessionRouter.patch('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  let body: UpdateSessionInput;
  try {
    body = updateSessionSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existing = await prisma.academicSession.findUnique({ where: { id } });
  if (!existing) return notFound('Session not found');

  if (body.isCurrent) {
    await prisma.academicSession.updateMany({
      where: { isCurrent: true, id: { not: id } },
      data: { isCurrent: false },
    });
  }

  const session = await prisma.academicSession.update({
    where: { id },
    data: {
      name: body.name,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      isCurrent: body.isCurrent,
      currentSemester: body.currentSemester,
    },
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'SESSION_UPDATE',
    entity: 'AcademicSession',
    entityId: id,
    metadata: body,
  });

  return ok({ session });
});

export { departmentRouter, sessionRouter };
