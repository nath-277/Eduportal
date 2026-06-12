import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { ok } from '../lib/response.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const settingsRouter = new Hono();

// GET /api/settings - Public
settingsRouter.get('/', async (_c) => {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'settings' },
  });

  if (!settings) {
    return ok({
      portalName: 'EduPortal',
      displayName: 'EduPortal — University Companion',
      maxLoginAttempts: 5,
      sessionExpiry: '24h',
      allowedEmailDomain: 'eduportal.com',
    });
  }

  return ok({
    portalName: settings.portalName,
    displayName: settings.displayName,
    maxLoginAttempts: settings.maxLoginAttempts,
    sessionExpiry: settings.sessionExpiry,
    allowedEmailDomain: settings.allowedEmailDomain,
  });
});

// PATCH /api/settings - Admin only
settingsRouter.patch('/', authenticate, authorize('ADMIN'), async (c) => {
  let body;
  try {
    body = updateSettingsSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const current = c.get('user');

  const settings = await prisma.systemSettings.upsert({
    where: { id: 'settings' },
    update: body,
    create: {
      id: 'settings',
      ...body,
    },
  });

  await writeAudit(c, {
    userId: current.userId,
    action: 'SETTINGS_UPDATE',
    entity: 'SystemSettings',
    entityId: 'settings',
    metadata: { fields: Object.keys(body) },
  });

  return ok({
    portalName: settings.portalName,
    displayName: settings.displayName,
    maxLoginAttempts: settings.maxLoginAttempts,
    sessionExpiry: settings.sessionExpiry,
    allowedEmailDomain: settings.allowedEmailDomain,
  });
});

export default settingsRouter;
