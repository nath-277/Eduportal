import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ok, badRequest } from '../lib/response.js';

const feedbackRouter = new Hono();

const feedbackSubmitSchema = z.object({
  easeOfUse: z.number().int().min(1).max(5),
  interfaceDesign: z.number().int().min(1).max(5),
  reliability: z.number().int().min(1).max(5),
  functionality: z.number().int().min(1).max(5),
  performance: z.number().int().min(1).max(5),
  comments: z.string().max(2000).optional().nullable(),
});

// GET /api/feedback/my-submission - Check if the user has already submitted feedback
feedbackRouter.get('/my-submission', authenticate, async (c) => {
  const user = c.get('user');
  
  const submission = await prisma.platformFeedback.findFirst({
    where: { userId: user.userId },
  });

  return ok({ hasSubmitted: !!submission });
});

// POST /api/feedback/submit - Submit feedback questionnaire
feedbackRouter.post('/submit', authenticate, async (c) => {
  const user = c.get('user');
  
  let body;
  try {
    body = feedbackSubmitSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  // Check if they already submitted to avoid duplicates
  const existing = await prisma.platformFeedback.findFirst({
    where: { userId: user.userId },
  });

  if (existing) {
    return badRequest('You have already submitted feedback for this platform.');
  }

  const feedback = await prisma.platformFeedback.create({
    data: {
      userId: user.userId,
      userRole: user.role,
      easeOfUse: body.easeOfUse,
      interfaceDesign: body.interfaceDesign,
      reliability: body.reliability,
      functionality: body.functionality,
      performance: body.performance,
      comments: body.comments,
    },
  });

  return ok({ feedback });
});

// GET /api/feedback/stats - Get aggregated statistics of feedback ratings (Admin only)
feedbackRouter.get('/stats', authenticate, authorize('ADMIN'), async (c) => {
  const aggregations = await prisma.platformFeedback.aggregate({
    _avg: {
      easeOfUse: true,
      interfaceDesign: true,
      reliability: true,
      functionality: true,
      performance: true,
    },
    _count: {
      id: true,
    },
  });

  const feedbacks = await prisma.platformFeedback.findMany({
    include: {
      user: {
        select: {
          fullname: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return ok({
    averages: {
      easeOfUse: aggregations._avg.easeOfUse ? Math.round(aggregations._avg.easeOfUse * 100) / 100 : 0,
      interfaceDesign: aggregations._avg.interfaceDesign ? Math.round(aggregations._avg.interfaceDesign * 100) / 100 : 0,
      reliability: aggregations._avg.reliability ? Math.round(aggregations._avg.reliability * 100) / 100 : 0,
      functionality: aggregations._avg.functionality ? Math.round(aggregations._avg.functionality * 100) / 100 : 0,
      performance: aggregations._avg.performance ? Math.round(aggregations._avg.performance * 100) / 100 : 0,
    },
    totalResponses: aggregations._count.id,
    feedbacks,
  });
});

// GET /api/feedback/export - Download feedback raw responses as CSV (Admin only)
feedbackRouter.get('/export', authenticate, authorize('ADMIN'), async (c) => {
  const feedbacks = await prisma.platformFeedback.findMany({
    include: {
      user: {
        select: {
          fullname: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  function escapeCsv(val: any): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headers = [
    'Feedback ID',
    'User Name',
    'User Email',
    'User Role',
    'Ease of Use',
    'Interface Design',
    'Reliability',
    'Functionality',
    'Performance',
    'Comments',
    'Submitted At',
  ];

  const rows = feedbacks.map((f) => [
    f.id,
    f.user?.fullname || 'Unknown',
    f.user?.email || 'Unknown',
    f.userRole,
    f.easeOfUse,
    f.interfaceDesign,
    f.reliability,
    f.functionality,
    f.performance,
    f.comments || '',
    f.createdAt.toISOString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="platform-feedback.csv"');
  
  return c.body(csvContent);
});

export default feedbackRouter;
