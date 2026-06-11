import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import type { ApiResponse } from '@eduportal/shared';
import { config } from './config.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import courseRouter from './routes/course.routes.js';
import enrollmentRouter from './routes/enrollment.routes.js';
import resultRouter from './routes/result.routes.js';
import resourceRouter from './routes/resource.routes.js';
import announcementRouter from './routes/announcement.routes.js';
import forumRouter from './routes/forum.routes.js';
import notificationRouter from './routes/notification.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import { departmentRouter, sessionRouter } from './routes/department.routes.js';

export const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  })
);

app.use('*', async (c, next) => {
  c.set('handleZodError', (error: unknown): Response => {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path.length > 0 ? issue.path.join('.') : '_';
        if (!fieldErrors[key]) {
          fieldErrors[key] = [];
        }
        fieldErrors[key].push(issue.message);
      }
      const body: ApiResponse<null> = {
        success: false,
        message: 'Validation failed',
        errors: fieldErrors,
      };
      return new Response(JSON.stringify(body), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ success: false, message: 'Bad request' } satisfies ApiResponse<null>),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  });
  await next();
});

app.get('/api/health', (c) => {
  const response: ApiResponse<{ status: string; timestamp: string; uptime: number }> = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
  return c.json(response);
});

app.route('/api/auth', authRouter);
app.route('/api/users', userRouter);
app.route('/api/courses', courseRouter);
app.route('/api/enrollments', enrollmentRouter);
app.route('/api/results', resultRouter);
app.route('/api/resources', resourceRouter);
app.route('/api/announcements', announcementRouter);
app.route('/api/forum', forumRouter);
app.route('/api/notifications', notificationRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/departments', departmentRouter);
app.route('/api/sessions', sessionRouter);

app.notFound((c) => {
  const response: ApiResponse<null> = {
    success: false,
    message: `Route ${c.req.method} ${c.req.path} not found`,
  };
  return c.json(response, 404);
});

app.onError((err, c) => {
  console.error('Server error:', err);
  const response: ApiResponse<null> = {
    success: false,
    message: err instanceof Error ? err.message : 'Internal server error',
  };
  return c.json(response, 500);
});

const start = (): void => {
  try {
    serve(
      {
        fetch: app.fetch,
        port: config.port,
      },
      (info) => {
        console.log(`🚀 API server running on http://localhost:${info.port}`);
        console.log(`📋 Health check: http://localhost:${info.port}/api/health`);
        console.log(`🔐 Auth:        http://localhost:${info.port}/api/auth`);
        console.log(`👥 Users:       http://localhost:${info.port}/api/users`);
        console.log(`📚 Courses:     http://localhost:${info.port}/api/courses`);
        console.log(`📝 Enrollments: http://localhost:${info.port}/api/enrollments`);
        console.log(`📊 Results:     http://localhost:${info.port}/api/results`);
        console.log(`📂 Resources:   http://localhost:${info.port}/api/resources`);
        console.log(`📢 Announce:    http://localhost:${info.port}/api/announcements`);
        console.log(`💬 Forum:       http://localhost:${info.port}/api/forum`);
        console.log(`🔔 Notify:      http://localhost:${info.port}/api/notifications`);
        console.log(`📈 Analytics:   http://localhost:${info.port}/api/analytics`);
      }
    );
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  start();
}

export default app;
