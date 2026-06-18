import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireCurrentSession } from '../lib/session.js';
import { computeGpa } from '../lib/grading.js';
import { parsePagination, paginated } from '../lib/pagination.js';
import { ok } from '../lib/response.js';
import {
  auditLogsQuerySchema,
  type AuditLogsQuery,
} from '../validators/analytics.validator.js';

const analyticsRouter = new Hono();

analyticsRouter.get('/admin', authenticate, authorize('ADMIN'), async (_c) => {
  const [totalStudents, totalLecturers, totalAdmins, totalResources, totalAnnouncements, totalCourses, recentLogs] =
    await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'LECTURER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.resource.count(),
      prisma.announcement.count(),
      prisma.course.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, fullname: true, email: true, role: true } } },
      }),
    ]);

  const activeSessions = await prisma.academicSession.count({ where: { isCurrent: true } });

  return ok({
    users: {
      students: totalStudents,
      lecturers: totalLecturers,
      admins: totalAdmins,
      total: totalStudents + totalLecturers + totalAdmins,
    },
    courses: totalCourses,
    resources: totalResources,
    announcements: totalAnnouncements,
    activeSessions,
    recentLogs,
  });
});

analyticsRouter.get('/department', authenticate, authorize('ADMIN'), async (_c) => {
  const sessionResult = await requireCurrentSession();
  if (!sessionResult.ok) return sessionResult.response;

  const levels: Array<'L100' | 'L200' | 'L300' | 'L400' | 'L500'> = [
    'L100',
    'L200',
    'L300',
    'L400',
    'L500',
  ];

  const perLevel: Array<{
    level: string;
    studentCount: number;
    courseCount: number;
    averageGpa: number;
  }> = [];

  for (const level of levels) {
    const [studentCount, courseCount, results] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', level } }),
      prisma.course.count({ where: { level } }),
      prisma.result.findMany({
        where: {
          isPublished: true,
          sessionId: sessionResult.session.id,
          student: { level },
        },
        include: { course: true },
      }),
    ]);

    const byStudent = new Map<string, typeof results>();
    for (const r of results) {
      const arr = byStudent.get(r.studentId) ?? [];
      arr.push(r);
      byStudent.set(r.studentId, arr);
    }
    const studentGpas: number[] = [];
    for (const rs of byStudent.values()) {
      studentGpas.push(
        computeGpa(
          rs.map((r) => ({
            totalScore: r.totalScore,
            gradePoint: r.gradePoint,
            course: { creditUnits: r.course.creditUnits },
          }))
        )
      );
    }
    const averageGpa =
      studentGpas.length > 0
        ? Math.round((studentGpas.reduce((s, g) => s + g, 0) / studentGpas.length) * 100) / 100
        : 0;

    perLevel.push({ level, studentCount, courseCount, averageGpa });
  }

  return ok({ session: sessionResult.session, perLevel });
});

analyticsRouter.get('/audit-logs', authenticate, authorize('ADMIN'), async (c) => {
  let query: AuditLogsQuery;
  try {
    query = auditLogsQuerySchema.parse({
      userId: c.req.query('userId'),
      action: c.req.query('action'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      page: c.req.query('page'),
      limit: c.req.query('limit'),
    });
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const { page, limit, skip } = parsePagination(
    String(query.page ?? ''),
    String(query.limit ?? '')
  );

  const where: Record<string, unknown> = {};
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = query.action;
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) (where.createdAt as Record<string, Date>).gte = new Date(query.startDate);
    if (query.endDate) (where.createdAt as Record<string, Date>).lte = new Date(query.endDate);
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, fullname: true, email: true, role: true } } },
    }),
  ]);

  return ok(paginated(logs, total, page, limit));
});

export default analyticsRouter;
