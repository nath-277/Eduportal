import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { requireCurrentSession } from '../lib/session.js';
import { badRequest, notFound, ok } from '../lib/response.js';
import {
  createEnrollmentsSchema,
  type CreateEnrollmentsInput,
} from '../validators/enrollment.validator.js';

const MAX_CREDIT_UNITS = 24;

const enrollmentRouter = new Hono();

enrollmentRouter.get('/mine', authenticate, authorize('STUDENT'), async (c) => {
  const { userId } = c.get('user');
  const sessionResult = await requireCurrentSession();
  if (!sessionResult.ok) return sessionResult.response;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: userId, sessionId: sessionResult.session.id },
    include: { course: { include: { department: true } } },
    orderBy: [{ semester: 'asc' }, { course: { code: 'asc' } }],
  });

  const grouped: Record<'FIRST' | 'SECOND', typeof enrollments> = { FIRST: [], SECOND: [] };
  for (const e of enrollments) {
    grouped[e.semester].push(e);
  }

  return ok({
    session: sessionResult.session,
    firstSemester: grouped.FIRST,
    secondSemester: grouped.SECOND,
  });
});

enrollmentRouter.post('/', authenticate, authorize('STUDENT'), async (c) => {
  const { userId } = c.get('user');
  let body: CreateEnrollmentsInput;
  try {
    body = createEnrollmentsSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const session = await prisma.academicSession.findUnique({ where: { id: body.sessionId } });
  if (!session) return notFound('Session not found');

  const student = await prisma.user.findUnique({ where: { id: userId } });
  if (!student) return notFound('Student not found');
  if (!student.level) return badRequest('Student has no level set');

  const courses = await prisma.course.findMany({
    where: { id: { in: body.courseIds } },
  });
  if (courses.length !== body.courseIds.length) {
    return badRequest('One or more courseIds are invalid');
  }

  const wrongLevel = courses.find((crs) => crs.level !== student.level);
  if (wrongLevel) {
    return badRequest(
      `Course ${wrongLevel.code} (${wrongLevel.level}) does not match student level (${student.level})`
    );
  }

  const wrongSemester = courses.find((crs) => crs.semester !== body.semester);
  if (wrongSemester) {
    return badRequest(
      `Course ${wrongSemester.code} is offered in ${wrongSemester.semester} semester, not ${body.semester}`
    );
  }

  const totalUnits = courses.reduce((sum, crs) => sum + crs.creditUnits, 0);
  if (totalUnits > MAX_CREDIT_UNITS) {
    return badRequest(
      `Total credit units (${totalUnits}) exceed the maximum of ${MAX_CREDIT_UNITS} per semester`
    );
  }

  const existing = await prisma.enrollment.findMany({
    where: {
      studentId: userId,
      sessionId: body.sessionId,
      courseId: { in: body.courseIds },
    },
    select: { courseId: true },
  });
  if (existing.length > 0) {
    const dupes = existing
      .map((e) => courses.find((crs) => crs.id === e.courseId)?.code)
      .filter(Boolean)
      .join(', ');
    return badRequest(`Already enrolled in: ${dupes}`);
  }

  const created = await prisma.$transaction(
    courses.map((crs) =>
      prisma.enrollment.create({
        data: {
          studentId: userId,
          courseId: crs.id,
          sessionId: body.sessionId,
          semester: body.semester,
        },
        include: { course: true },
      })
    )
  );

  await writeAudit(c, {
    userId,
    action: 'ENROLLMENT_CREATE',
    entity: 'Enrollment',
    metadata: { courseIds: body.courseIds, sessionId: body.sessionId, totalUnits },
  });

  return c.json(
    {
      success: true,
      data: {
        count: created.length,
        totalCreditUnits: totalUnits,
        enrollments: created,
      },
    },
    201
  );
});

enrollmentRouter.delete('/:courseId', authenticate, authorize('STUDENT'), async (c) => {
  const { courseId } = c.req.param();
  const { userId } = c.get('user');

  const sessionResult = await requireCurrentSession();
  if (!sessionResult.ok) return sessionResult.response;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: userId, courseId, sessionId: sessionResult.session.id },
    include: { course: true },
  });
  if (!enrollment) return notFound('Enrollment not found');

  const publishedResult = await prisma.result.findFirst({
    where: { studentId: userId, courseId, isPublished: true },
  });
  if (publishedResult) {
    return badRequest('Cannot drop a course whose results have already been published');
  }

  await prisma.enrollment.delete({ where: { id: enrollment.id } });

  await writeAudit(c, {
    userId,
    action: 'ENROLLMENT_DROP',
    entity: 'Enrollment',
    entityId: enrollment.id,
    metadata: { courseId },
  });

  return ok({ message: `Dropped ${enrollment.course.code}` });
});

enrollmentRouter.get(
  '/course/:courseId',
  authenticate,
  authorize('LECTURER', 'ADMIN'),
  async (c) => {
    const { courseId } = c.req.param();
    const sessionResult = await requireCurrentSession();
    if (!sessionResult.ok) return sessionResult.response;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return notFound('Course not found');

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, sessionId: sessionResult.session.id },
      include: {
        student: {
          select: {
            id: true,
            fullname: true,
            email: true,
            matricNumber: true,
            level: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { student: { matricNumber: 'asc' } },
    });

    return ok({
      course,
      session: sessionResult.session,
      count: enrollments.length,
      students: enrollments.map((e) => e.student),
    });
  }
);

export default enrollmentRouter;
