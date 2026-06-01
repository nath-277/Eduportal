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
  type UploadResultsInput,
  type CsvUploadInput,
  type MyResultsQuery,
  type UploadResultEntry,
} from '../validators/result.validator.js';

const resultRouter = new Hono();

interface UploadSummary {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ matricNumber: string; reason: string }>;
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

  const where: Record<string, unknown> = { studentId: userId, isPublished: true };
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
      if (existing.isPublished) {
        summary.failed += 1;
        summary.errors.push({
          matricNumber: entry.matricNumber,
          reason: 'Result already published; cannot update',
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
  '/:id/publish',
  authenticate,
  authorize('LECTURER', 'ADMIN'),
  async (c) => {
    const { id } = c.req.param();
    const result = await prisma.result.findUnique({ where: { id } });
    if (!result) return notFound('Result not found');
    if (result.isPublished) return badRequest('Result is already published');

    const updated = await prisma.result.update({
      where: { id },
      data: { isPublished: true },
    });

    await prisma.notification.create({
      data: {
        userId: result.studentId,
        category: 'RESULT',
        title: 'New result published',
        message: 'A new result has been published for one of your courses.',
        link: `/results/${result.id}`,
      },
    });

    await writeAudit(c, {
      userId: c.get('user').userId,
      action: 'RESULT_PUBLISH',
      entity: 'Result',
      entityId: id,
    });

    return ok({ result: updated });
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
      where: { studentId, isPublished: true },
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
