import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { requireCurrentSession } from '../lib/session.js';
import { badRequest, conflict, notFound, ok } from '../lib/response.js';
import {
  listCoursesSchema,
  createCourseSchema,
  updateCourseSchema,
  assignCourseSchema,
  type ListCoursesQuery,
  type CreateCourseInput,
  type UpdateCourseInput,
  type AssignCourseInput,
} from '../validators/course.validator.js';

const courseRouter = new Hono();

courseRouter.get('/', async (c) => {
  let query: ListCoursesQuery;
  try {
    query = listCoursesSchema.parse({
      level: c.req.query('level'),
      semester: c.req.query('semester'),
      departmentId: c.req.query('departmentId'),
    });
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const where: Record<string, unknown> = {};
  if (query.level) where.level = query.level;
  if (query.semester) where.semester = query.semester;
  if (query.departmentId) where.departmentId = query.departmentId;

  const courses = await prisma.course.findMany({
    where,
    orderBy: [{ level: 'asc' }, { code: 'asc' }],
    include: {
      department: true,
      assignments: {
        include: { lecturer: { select: { id: true, fullname: true, email: true } } },
      },
    },
  });

  return ok(
    courses.map((course) => ({
      ...course,
      lecturers: course.assignments.map((a) => a.lecturer),
      assignments: undefined,
    }))
  );
});

courseRouter.post('/', authenticate, authorize('ADMIN'), async (c) => {
  let body: CreateCourseInput;
  try {
    body = createCourseSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const codeExists = await prisma.course.findUnique({ where: { code: body.code.toUpperCase() } });
  if (codeExists) return conflict('Course code already exists');

  const dept = await prisma.department.findUnique({ where: { id: body.departmentId } });
  if (!dept) return badRequest('Invalid departmentId');

  const course = await prisma.course.create({
    data: {
      code: body.code.toUpperCase(),
      title: body.title,
      creditUnits: body.creditUnits,
      level: body.level,
      semester: body.semester,
      description: body.description,
      departmentId: body.departmentId,
    },
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'COURSE_CREATE',
    entity: 'Course',
    entityId: course.id,
  });

  return c.json({ success: true, data: course }, 201);
});

courseRouter.patch('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  let body: UpdateCourseInput;
  try {
    body = updateCourseSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return notFound('Course not found');

  if (body.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: body.departmentId } });
    if (!dept) return badRequest('Invalid departmentId');
  }

  const course = await prisma.course.update({ where: { id }, data: body });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'COURSE_UPDATE',
    entity: 'Course',
    entityId: id,
    metadata: { fields: Object.keys(body) },
  });

  return ok({ course });
});

courseRouter.delete('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return notFound('Course not found');

  const resultCount = await prisma.result.count({ where: { courseId: id } });
  if (resultCount > 0) {
    return badRequest('Cannot delete a course that has results linked');
  }

  await prisma.courseAssignment.deleteMany({ where: { courseId: id } });
  await prisma.enrollment.deleteMany({ where: { courseId: id } });
  await prisma.course.delete({ where: { id } });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'COURSE_DELETE',
    entity: 'Course',
    entityId: id,
  });

  return c.json({ success: true, message: 'Course deleted' }, 200);
});

courseRouter.post('/:id/assign', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  let body: AssignCourseInput;
  try {
    body = assignCourseSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return notFound('Course not found');

  const lecturer = await prisma.user.findUnique({ where: { id: body.lecturerId } });
  if (!lecturer) return notFound('Lecturer not found');
  if (lecturer.role !== 'LECTURER') {
    return badRequest('Assigned user must have LECTURER role');
  }

  const existing = await prisma.courseAssignment.findUnique({
    where: {
      courseId_lecturerId_session: {
        courseId: id,
        lecturerId: body.lecturerId,
        session: body.session,
      },
    },
  });
  if (existing) {
    return conflict('This lecturer is already assigned to this course for that session');
  }

  const assignment = await prisma.courseAssignment.create({
    data: {
      courseId: id,
      lecturerId: body.lecturerId,
      session: body.session,
    },
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'COURSE_ASSIGN',
    entity: 'Course',
    entityId: id,
    metadata: { lecturerId: body.lecturerId, session: body.session },
  });

  return c.json({ success: true, data: assignment }, 201);
});

courseRouter.get('/lecturer/mine', authenticate, authorize('LECTURER', 'ADMIN'), async (c) => {
  const sessionResult = await requireCurrentSession();
  if (!sessionResult.ok) return sessionResult.response;

  const assignments = await prisma.courseAssignment.findMany({
    where: {
      lecturerId: c.get('user').userId,
      session: sessionResult.session.name,
    },
    include: { course: { include: { department: true } } },
    orderBy: { course: { code: 'asc' } },
  });

  return ok({ session: sessionResult.session, courses: assignments.map((a) => a.course) });
});

export default courseRouter;
