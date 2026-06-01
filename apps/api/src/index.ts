import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ZodError } from 'zod';
import type { ApiResponse } from '@eduportal/shared';
import { config } from './config.js';
import authRouter from './routes/auth.routes.js';

const app = new Hono();

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
      }
    );
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
