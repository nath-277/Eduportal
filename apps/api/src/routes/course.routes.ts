import { Hono } from 'hono';
import type { Prisma } from '@prisma/client';
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
      programmeId: c.req.query('programmeId'),
      studentId: c.req.query('studentId'),
    });
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const where: Record<string, unknown> = {};
  if (query.level) where.level = query.level;
  if (query.semester) where.semester = query.semester;
  if (query.departmentId) where.departmentId = query.departmentId;

  if (query.programmeId) {
    where.OR = [
      { programmeId: null },
      { programmeId: query.programmeId },
    ];
  }

  const standardCourses = await prisma.course.findMany({
    where,
    orderBy: [{ level: 'asc' }, { code: 'asc' }],
    include: {
      department: true,
      programme: true,
      assignments: {
        include: { lecturer: { select: { id: true, fullname: true, email: true } } },
      },
    },
  });

  let carryOverCourses: typeof standardCourses = [];
  if (query.studentId) {
    const allResults = await prisma.result.findMany({
      where: { studentId: query.studentId, status: 'PUBLISHED' },
    });

    const failedCourseIds = new Set<string>();
    const passedCourseIds = new Set<string>();

    for (const r of allResults) {
      if (r.totalScore < 40 || r.grade === 'F') {
        failedCourseIds.add(r.courseId);
      } else {
        passedCourseIds.add(r.courseId);
      }
    }

    const activeCarryOverCourseIds = [...failedCourseIds].filter((id) => !passedCourseIds.has(id));

    if (activeCarryOverCourseIds.length > 0) {
      const carryOverWhere: Prisma.CourseWhereInput = {
        id: { in: activeCarryOverCourseIds },
      };
      if (query.semester) {
        carryOverWhere.semester = query.semester;
      }
      carryOverCourses = await prisma.course.findMany({
        where: carryOverWhere,
        include: {
          department: true,
          programme: true,
          assignments: {
            include: { lecturer: { select: { id: true, fullname: true, email: true } } },
          },
        },
      });
    }
  }

  const allCourses = [...standardCourses];
  const standardIds = new Set(standardCourses.map((c) => c.id));
  for (const c of carryOverCourses) {
    if (!standardIds.has(c.id)) {
      allCourses.push(c);
    }
  }

  return ok(
    allCourses.map((course) => ({
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

  if (body.programmeId) {
    const prog = await prisma.programme.findUnique({ where: { id: body.programmeId } });
    if (!prog) return badRequest('Invalid programmeId');
    if (prog.departmentId !== body.departmentId) {
      return badRequest('Selected programme does not belong to the selected department');
    }
  }

  const course = await prisma.course.create({
    data: {
      code: body.code.toUpperCase(),
      title: body.title,
      creditUnits: body.creditUnits,
      level: body.level,
      semester: body.semester,
      type: body.type,
      description: body.description,
      departmentId: body.departmentId,
      programmeId: body.programmeId || null,
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

  if (body.code) {
    body.code = body.code.toUpperCase();
    if (body.code !== existing.code) {
      const codeExists = await prisma.course.findUnique({ where: { code: body.code } });
      if (codeExists) return conflict('Course code already exists');
    }
  }

  if (body.programmeId !== undefined && body.programmeId !== null) {
    const prog = await prisma.programme.findUnique({ where: { id: body.programmeId } });
    if (!prog) return badRequest('Invalid programmeId');
    const deptId = body.departmentId || existing.departmentId;
    if (deptId && prog.departmentId !== deptId) {
      return badRequest('Selected programme does not belong to the selected department');
    }
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
