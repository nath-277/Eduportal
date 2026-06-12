import { serve } from '@hono/node-server';
import { config } from './config.js';
import { app } from './app.js';

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

