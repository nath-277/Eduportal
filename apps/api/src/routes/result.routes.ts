import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { requireCurrentSession } from '../lib/session.js';
import { computeGpa, computeGraded } from '../lib/grading.js';
import { parseCsv } from '../lib/csv.js';
import { badRequest, forbidden, notFound, ok } from '../lib/response.js';
import {
  uploadResultsSchema,
  csvUploadSchema,
  myResultsQuerySchema,
  bulkResultActionSchema,
  type UploadResultsInput,
  type CsvUploadInput,
  type MyResultsQuery,
  type UploadResultEntry,
  type BulkResultActionInput,
} from '../validators/result.validator.js';

const resultRouter = new Hono();

interface UploadSummary {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ matricNumber: string; reason: string }>;
}

async function notifyStudentPublished(studentId: string, _resultId: string): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: studentId,
      category: 'RESULT',
      title: 'New result published',
      message: 'A new result has been published for one of your courses.',
      link: `/student/results`,
    },
  });
}

resultRouter.get('/mine', authenticate, authorize('STUDENT'), async (c) => {
  const { userId } = c.get('user');
  let query: MyResultsQuery;
  try {
    query = myResultsQuerySchema.parse({
      sessionId: c.req.query('sessionId'),
      semester: c.req.query('semester'),
    });
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const where: Record<string, unknown> = { studentId: userId, status: 'PUBLISHED' };
  if (query.sessionId) where.sessionId = query.sessionId;
  if (query.semester) where.semester = query.semester;

  const results = await prisma.result.findMany({
    where,
    include: { course: { include: { department: true } }, session: true },
    orderBy: [{ session: { name: 'desc' } }, { semester: 'asc' }, { course: { code: 'asc' } }],
  });

  type ResultWithCourse = (typeof results)[number];
  const bySession = new Map<string, ResultWithCourse[]>();
  for (const r of results) {
    const arr = bySession.get(r.sessionId) ?? [];
    arr.push(r);
    bySession.set(r.sessionId, arr);
  }

  const semesters: Array<{
    sessionId: string;
    sessionName: string;
    semester: 'FIRST' | 'SECOND';
    gpa: number;
    results: typeof results;
  }> = [];

  for (const [sessionId, rs] of bySession) {
    const semestersInSession = new Set<'FIRST' | 'SECOND'>(rs.map((r) => r.semester));
    for (const sem of semestersInSession) {
      const inSem = rs.filter((r) => r.semester === sem);
      const gpa = computeGpa(
        inSem.map((r) => ({
          totalScore: r.totalScore,
          gradePoint: r.gradePoint,
          course: { creditUnits: r.course.creditUnits },
        }))
      );
      const first = inSem[0];
      if (first) {
        semesters.push({
          sessionId,
          sessionName: first.session.name,
          semester: sem,
          gpa,
          results: inSem,
        });
      }
    }
  }

  const cgpa = computeGpa(
    results.map((r) => ({
      totalScore: r.totalScore,
      gradePoint: r.gradePoint,
      course: { creditUnits: r.course.creditUnits },
    }))
  );

  return ok({ cgpa, semesters });
});

resultRouter.get(
  '/course/:courseId',
  authenticate,
  authorize('LECTURER', 'ADMIN'),
  async (c) => {
    const { courseId } = c.req.param();
    const sessionResult = await requireCurrentSession();
    if (!sessionResult.ok) return sessionResult.response;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return notFound('Course not found');

    const results = await prisma.result.findMany({
      where: { courseId, sessionId: sessionResult.session.id },
      include: { student: { select: { id: true, fullname: true, matricNumber: true } } },
      orderBy: { student: { matricNumber: 'asc' } },
    });

    return ok({ course, session: sessionResult.session, results });
  }
);

resultRouter.get(
  '/pending',
  authenticate,
  authorize('ADMIN'),
  async (c) => {
    const sessionResult = await requireCurrentSession();
    if (!sessionResult.ok) return sessionResult.response;

    const sessionId = c.req.query('sessionId') ?? sessionResult.session.id;

    const results = await prisma.result.findMany({
      where: { sessionId, status: { in: ['SUBMITTED', 'APPROVED'] } },
      include: {
        student: { select: { id: true, fullname: true, matricNumber: true } },
        course: { include: { department: true } },
        session: true,
      },
      orderBy: [{ course: { code: 'asc' } }, { student: { matricNumber: 'asc' } }],
    });

    const byCourse = new Map<
      string,
      {
        course: (typeof results)[number]['course'];
        semester: 'FIRST' | 'SECOND';
        session: (typeof results)[number]['session'];
        submitted: number;
        approved: number;
        results: typeof results;
      }
    >();

    for (const r of results) {
      const key = `${r.courseId}:${r.semester}`;
      const existing = byCourse.get(key);
      if (existing) {
        existing.results.push(r);
        if (r.status === 'SUBMITTED') existing.submitted += 1;
        else if (r.status === 'APPROVED') existing.approved += 1;
      } else {
        byCourse.set(key, {
          course: r.course,
          semester: r.semester,
          session: r.session,
          submitted: r.status === 'SUBMITTED' ? 1 : 0,
          approved: r.status === 'APPROVED' ? 1 : 0,
          results: [r],
        });
      }
    }

    return ok({
      session: sessionResult.session,
      groups: Array.from(byCourse.values()),
      counts: {
        submitted: results.filter((r) => r.status === 'SUBMITTED').length,
        approved: results.filter((r) => r.status === 'APPROVED').length,
        total: results.length,
      },
    });
  }
);

async function processResultUploads(
  userId: string,
  input: UploadResultsInput,
  entries: UploadResultEntry[]
): Promise<UploadSummary> {
  const summary: UploadSummary = { inserted: 0, updated: 0, failed: 0, errors: [] };

  for (const entry of entries) {
    const student = await prisma.user.findUnique({
      where: { matricNumber: entry.matricNumber },
    });
    if (!student || student.role !== 'STUDENT') {
      summary.failed += 1;
      summary.errors.push({ matricNumber: entry.matricNumber, reason: 'Student not found' });
      continue;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId_sessionId: {
          studentId: student.id,
          courseId: input.courseId,
          sessionId: input.sessionId,
        },
      },
    });
    if (!enrollment) {
      summary.failed += 1;
      summary.errors.push({
        matricNumber: entry.matricNumber,
        reason: 'Student is not enrolled in this course for that session',
      });
      continue;
    }

    const { totalScore, grade, gradePoint } = computeGraded(entry.caScore, entry.examScore);

    const existing = await prisma.result.findUnique({
      where: {
        studentId_courseId_sessionId: {
          studentId: student.id,
          courseId: input.courseId,
          sessionId: input.sessionId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'APPROVED' || existing.status === 'PUBLISHED') {
        summary.failed += 1;
        summary.errors.push({
          matricNumber: entry.matricNumber,
          reason: `Result already ${existing.status.toLowerCase()}; cannot update`,
        });
        continue;
      }
      await prisma.result.update({
        where: { id: existing.id },
        data: {
          caScore: entry.caScore,
          examScore: entry.examScore,
          totalScore,
          grade,
          gradePoint,
          uploadedById: userId,
          status: 'SUBMITTED',
        },
      });
      summary.updated += 1;
    } else {
      await prisma.result.create({
        data: {
          studentId: student.id,
          courseId: input.courseId,
          sessionId: input.sessionId,
          semester: input.semester,
          caScore: entry.caScore,
          examScore: entry.examScore,
          totalScore,
          grade,
          gradePoint,
          uploadedById: userId,
          status: 'SUBMITTED',
        },
      });
      summary.inserted += 1;
    }
  }

  return summary;
}

resultRouter.post('/upload', authenticate, authorize('LECTURER', 'ADMIN'), async (c) => {
  let body: UploadResultsInput;
  try {
    body = uploadResultsSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const course = await prisma.course.findUnique({ where: { id: body.courseId } });
  if (!course) return notFound('Course not found');

  const session = await prisma.academicSession.findUnique({ where: { id: body.sessionId } });
  if (!session) return notFound('Session not found');

  const summary = await processResultUploads(c.get('user').userId, body, body.results);

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'RESULT_UPLOAD',
    entity: 'Course',
    entityId: body.courseId,
    metadata: { inserted: summary.inserted, updated: summary.updated, failed: summary.failed },
  });

  return ok({ summary });
});

resultRouter.post(
  '/upload/csv',
  authenticate,
  authorize('LECTURER', 'ADMIN'),
  async (c) => {
    let body: CsvUploadInput;
    try {
      body = csvUploadSchema.parse(await c.req.json());
    } catch (e) {
      return c.var.handleZodError(e);
    }

    const rows = parseCsv(body.csv);
    const entries: UploadResultEntry[] = [];
    const parseErrors: Array<{ matricNumber: string; reason: string }> = [];

    for (const row of rows) {
      const matricNumber = row['matricnumber'] ?? row['matric_number'] ?? '';
      const ca = Number.parseFloat(row['cascore'] ?? row['ca'] ?? '');
      const exam = Number.parseFloat(row['examscore'] ?? row['exam'] ?? '');

      if (!matricNumber || Number.isNaN(ca) || Number.isNaN(exam)) {
        parseErrors.push({
          matricNumber: matricNumber || '?',
          reason: 'Invalid or missing columns (expected matricNumber, caScore, examScore)',
        });
        continue;
      }
      if (ca < 0 || ca > 100 || exam < 0 || exam > 100) {
        parseErrors.push({ matricNumber, reason: 'Scores must be between 0 and 100' });
        continue;
      }
      entries.push({ matricNumber, caScore: ca, examScore: exam });
    }

    if (entries.length === 0) {
      return badRequest('No valid rows parsed from CSV', { csv: parseErrors.map((e) => e.reason) });
    }

    const summary = await processResultUploads(
      c.get('user').userId,
      { courseId: body.courseId, sessionId: body.sessionId, semester: body.semester, results: entries },
      entries
    );

    await writeAudit(c, {
      userId: c.get('user').userId,
      action: 'RESULT_UPLOAD_CSV',
      entity: 'Course',
      entityId: body.courseId,
      metadata: {
        inserted: summary.inserted,
        updated: summary.updated,
        failed: summary.failed,
        parseErrors: parseErrors.length,
      },
    });

    return ok({ ...summary, parseErrors, totalRowsParsed: rows.length });
  }
);

resultRouter.patch(
  '/:id/approve',
  authenticate,
  authorize('ADMIN'),
  async (c) => {
    const { id } = c.req.param();
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) return notFound('Result not found');
    if (result.status !== 'SUBMITTED') {
      return badRequest(`Result is not awaiting approval (status: ${result.status})`);
    }

    const updated = await prisma.result.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: c.get('user').userId,
        approvedAt: new Date(),
      },
    });

    await writeAudit(c, {
      userId: c.get('user').userId,
      action: 'RESULT_APPROVE',
      entity: 'Result',
      entityId: id,
    });

    return ok({ result: updated });
  }
);

resultRouter.patch(
  '/:id/push',
  authenticate,
  authorize('ADMIN'),
  async (c) => {
    const { id } = c.req.param();
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) return notFound('Result not found');
    if (result.status !== 'APPROVED') {
      return badRequest(`Result must be approved before pushing (status: ${result.status})`);
    }

    const updated = await prisma.result.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        isPublished: true,
        publishedById: c.get('user').userId,
        publishedAt: new Date(),
      },
    });

    await notifyStudentPublished(result.studentId, result.id);

    await writeAudit(c, {
      userId: c.get('user').userId,
      action: 'RESULT_PUSH',
      entity: 'Result',
      entityId: id,
    });

    return ok({ result: updated });
  }
);

resultRouter.post(
  '/bulk-approve',
  authenticate,
  authorize('ADMIN'),
  async (c) => {
    let body: BulkResultActionInput;
    try {
      body = bulkResultActionSchema.parse(await c.req.json());
    } catch (e) {
      return c.var.handleZodError(e);
    }

    const sessionResult = await requireCurrentSession();
    if (!sessionResult.ok) return sessionResult.response;

    const result = await prisma.result.updateMany({
      where: {
        courseId: body.courseId,
        sessionId: sessionResult.session.id,
        semester: body.semester,
        status: 'SUBMITTED',
      },
      data: {
        status: 'APPROVED',
        approvedById: c.get('user').userId,
        approvedAt: new Date(),
      },
    });

    await writeAudit(c, {
      userId: c.get('user').userId,
      action: 'RESULT_BULK_APPROVE',
      entity: 'Course',
      entityId: body.courseId,
      metadata: { semester: body.semester, updated: result.count },
    });

    return ok({ updated: result.count });
  }
);

resultRouter.post(
  '/bulk-push',
  authenticate,
  authorize('ADMIN'),
  async (c) => {
    let body: BulkResultActionInput;
    try {
      body = bulkResultActionSchema.parse(await c.req.json());
    } catch (e) {
      return c.var.handleZodError(e);
    }

    const sessionResult = await requireCurrentSession();
    if (!sessionResult.ok) return sessionResult.response;

    const approved = await prisma.result.findMany({
      where: {
        courseId: body.courseId,
        sessionId: sessionResult.session.id,
        semester: body.semester,
        status: 'APPROVED',
      },
      select: { id: true, studentId: true },
    });

    if (approved.length === 0) {
      return badRequest('No approved results to push for this course/semester');
    }

    const result = await prisma.result.updateMany({
      where: { id: { in: approved.map((r) => r.id) } },
      data: {
        status: 'PUBLISHED',
        isPublished: true,
        publishedById: c.get('user').userId,
        publishedAt: new Date(),
      },
    });

    await prisma.notification.createMany({
      data: approved.map((r) => ({
        userId: r.studentId,
        category: 'RESULT' as const,
        title: 'New result published',
        message: 'A new result has been published for one of your courses.',
        link: '/student/results',
      })),
    });

    await writeAudit(c, {
      userId: c.get('user').userId,
      action: 'RESULT_BULK_PUSH',
      entity: 'Course',
      entityId: body.courseId,
      metadata: { semester: body.semester, updated: result.count },
    });

    return ok({ updated: result.count, notified: approved.length });
  }
);

resultRouter.get(
  '/analytics/student/:studentId',
  authenticate,
  async (c) => {
    const { studentId } = c.req.param();
    const current = c.get('user');

    if (current.role === 'STUDENT' && current.userId !== studentId) {
      return forbidden('You can only view your own analytics');
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { department: true },
    });
    if (!student) return notFound('Student not found');

    const results = await prisma.result.findMany({
      where: { studentId, status: 'PUBLISHED' },
      include: { course: true, session: true },
      orderBy: { createdAt: 'asc' },
    });

    const bySession = new Map<
      string,
      { session: (typeof results)[number]['session']; results: typeof results }
    >();
    for (const r of results) {
      const arr = bySession.get(r.sessionId);
      if (arr) arr.results.push(r);
      else bySession.set(r.sessionId, { session: r.session, results: [r] });
    }

    const trend: Array<{ session: string; semester: 'FIRST' | 'SECOND'; gpa: number; units: number }> = [];
    for (const { session, results: rs } of bySession.values()) {
      const semesters = new Set<'FIRST' | 'SECOND'>(rs.map((r) => r.semester));
      for (const sem of semesters) {
        const inSem = rs.filter((r) => r.semester === sem);
        const units = inSem.reduce((s, r) => s + r.course.creditUnits, 0);
        const gpa = computeGpa(
          inSem.map((r) => ({
            totalScore: r.totalScore,
            gradePoint: r.gradePoint,
            course: { creditUnits: r.course.creditUnits },
          }))
        );
        trend.push({ session: session.name, semester: sem, gpa, units });
      }
    }

    const cgpa = computeGpa(
      results.map((r) => ({
        totalScore: r.totalScore,
        gradePoint: r.gradePoint,
        course: { creditUnits: r.course.creditUnits },
      }))
    );

    return ok({ student: { id: student.id, fullname: student.fullname, matricNumber: student.matricNumber, department: student.department }, cgpa, trend });
  }
);

export default resultRouter;
