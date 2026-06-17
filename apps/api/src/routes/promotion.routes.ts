import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok, badRequest } from '../lib/response.js';
import { computeGpa } from '../lib/grading.js';
import { syncUserCommunities } from '../lib/community.js';
import { Level } from '@prisma/client';

const promotionRouter = new Hono();

// Helper to determine next level
function getNextLevel(currentLevel: string, maxLevel: string): string {
  const order = ['L100', 'L200', 'L300', 'L400', 'L500'];
  const currentIndex = order.indexOf(currentLevel);
  const maxIndex = order.indexOf(maxLevel);

  if (currentIndex === -1) return 'GRADUATED';
  if (currentIndex >= maxIndex) {
    return 'GRADUATED';
  }

  const nextIndex = currentIndex + 1;
  return nextIndex < order.length ? (order[nextIndex] as string) : 'GRADUATED';
}

// GET /api/promotions/preview - Preview promotion outcomes for students
promotionRouter.get('/preview', authenticate, authorize('ADMIN'), async (c) => {
  const sessionId = c.req.query('sessionId');
  if (!sessionId) {
    return badRequest('Session ID is required');
  }

  const session = await prisma.academicSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return badRequest('Academic session not found');
  }

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      isActive: true,
      level: { not: 'GRADUATED' },
    },
    include: {
      department: true,
      results: {
        where: { status: 'PUBLISHED' },
        include: {
          course: { select: { creditUnits: true } },
        },
      },
    },
  });

  const previews = students.map((student) => {
    const cgpa = computeGpa(
      student.results.map((r) => ({
        totalScore: r.totalScore,
        gradePoint: r.gradePoint,
        course: { creditUnits: r.course.creditUnits },
      }))
    );

    // Calculate next level and outcome status
    let toLevel = student.level as string;
    let status = 'REPEATED'; // Probational repeating

    if (cgpa >= 1.50) {
      const maxLvl = student.department?.maxLevel || 'L400';
      toLevel = getNextLevel(student.level || 'L100', maxLvl);
      status = toLevel === 'GRADUATED' ? 'GRADUATED' : 'PROMOTED';
    }

    return {
      studentId: student.id,
      fullname: student.fullname,
      matricNumber: student.matricNumber,
      department: student.department?.name || 'Unknown',
      currentLevel: student.level || 'L100',
      cgpa,
      projectedLevel: toLevel,
      status, // PROMOTED, REPEATED, GRADUATED
    };
  });

  return ok({ previews });
});

// POST /api/promotions/execute - Bulk advance student academic levels
promotionRouter.post('/execute', authenticate, authorize('ADMIN'), async (c) => {
  const body = await c.req.json();
  const { sessionId, studentIds } = body;

  if (!sessionId || !Array.isArray(studentIds) || studentIds.length === 0) {
    return badRequest('Session ID and student IDs array are required');
  }

  const session = await prisma.academicSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return badRequest('Academic session not found');
  }

  const students = await prisma.user.findMany({
    where: {
      id: { in: studentIds },
      role: 'STUDENT',
      isActive: true,
      level: { not: 'GRADUATED' },
    },
    include: {
      department: true,
      results: {
        where: { status: 'PUBLISHED' },
        include: {
          course: { select: { creditUnits: true } },
        },
      },
    },
  });

  const results: Array<{ studentId: string; status: string; toLevel: string }> = [];

  await prisma.$transaction(async (tx) => {
    for (const student of students) {
      const cgpa = computeGpa(
        student.results.map((r) => ({
          totalScore: r.totalScore,
          gradePoint: r.gradePoint,
          course: { creditUnits: r.course.creditUnits },
        }))
      );

      let toLevel = student.level as string;
      let status = 'REPEATED';

      if (cgpa >= 1.50) {
        const maxLvl = student.department?.maxLevel || 'L400';
        toLevel = getNextLevel(student.level || 'L100', maxLvl);
        status = toLevel === 'GRADUATED' ? 'GRADUATED' : 'PROMOTED';
      }

      const fromLevel = student.level || 'L100';

      await tx.user.update({
        where: { id: student.id },
        data: { level: toLevel as Level },
      });

      await tx.promotionHistory.create({
        data: {
          studentId: student.id,
          fromLevel: fromLevel as Level,
          toLevel: toLevel as Level,
          cgpa,
          sessionName: session.name,
          status,
        },
      });

      let message = '';
      if (status === 'GRADUATED') {
        message = `Congratulations! You have completed your studies and graduated with a CGPA of ${cgpa.toFixed(2)}.`;
      } else if (status === 'PROMOTED') {
        message = `Congratulations! You have been promoted to ${toLevel} for the ${session.name} session with a CGPA of ${cgpa.toFixed(2)}.`;
      } else {
        message = `You are on academic probation/repeating ${fromLevel} for the ${session.name} session due to a CGPA of ${cgpa.toFixed(2)} (below 1.50).`;
      }

      await tx.notification.create({
        data: {
          userId: student.id,
          category: 'SYSTEM',
          title: status === 'REPEATED' ? 'Academic Probation Notice' : 'Academic Advancement Status Update',
          message,
          link: '/student/results',
        },
      });

      results.push({ studentId: student.id, status, toLevel });
    }
  });

  // Sync communities in background
  for (const r of results) {
    try {
      await syncUserCommunities(r.studentId);
    } catch (err) {
      console.error(`Failed to sync communities for ${r.studentId}:`, err);
    }
  }

  return ok({ message: `Successfully executed promotions for ${results.length} students` });
});

export default promotionRouter;
