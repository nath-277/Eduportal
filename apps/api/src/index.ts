/// <reference types="bun" />

import { config } from './config.js';
import { app } from './app.js';

console.log(`🚀 API server running on http://localhost:${config.port}`);
console.log(`📋 Health check: http://localhost:${config.port}/api/health`);
console.log(`🔐 Auth:        http://localhost:${config.port}/api/auth`);
console.log(`👥 Users:       http://localhost:${config.port}/api/users`);
console.log(`📚 Courses:     http://localhost:${config.port}/api/courses`);
console.log(`📝 Enrollments: http://localhost:${config.port}/api/enrollments`);
console.log(`📊 Results:     http://localhost:${config.port}/api/results`);
console.log(`📂 Resources:   http://localhost:${config.port}/api/resources`);
console.log(`📢 Announce:    http://localhost:${config.port}/api/announcements`);
console.log(`💬 Forum:       http://localhost:${config.port}/api/forum`);
console.log(`🔔 Notify:      http://localhost:${config.port}/api/notifications`);
console.log(`📈 Analytics:   http://localhost:${config.port}/api/analytics`);

export default {
  port: config.port,
  fetch: app.fetch,
};

