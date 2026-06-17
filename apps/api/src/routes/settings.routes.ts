import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { ok } from '../lib/response.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';
import { uploadBase64, isCloudinaryConfigured } from '../lib/cloudinary.js';

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
      facultyName: 'Computing & Information Sciences',
      maxLoginAttempts: 5,
      sessionExpiry: '24h',
      allowedEmailDomain: 'eduportal.com',
      portalLogoUrl: null,
    });
  }

  return ok({
    portalName: settings.portalName,
    displayName: settings.displayName,
    facultyName: settings.facultyName,
    maxLoginAttempts: settings.maxLoginAttempts,
    sessionExpiry: settings.sessionExpiry,
    allowedEmailDomain: settings.allowedEmailDomain,
    portalLogoUrl: settings.portalLogoUrl,
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

  let portalLogoUrl = body.portalLogoUrl;

  if (body.portalLogo) {
    if (!isCloudinaryConfigured()) {
      return c.json({
        success: false,
        message: 'Cloudinary is not configured. Please set the environment variables.',
      }, 400);
    }
    try {
      const uploaded = await uploadBase64(body.portalLogo, 'eduportal/branding');
      portalLogoUrl = uploaded.url;
    } catch (err) {
      console.error('Branding logo upload failed:', err);
      return c.json({
        success: false,
        message: 'Failed to upload portal logo to Cloudinary.',
      }, 500);
    }
  }

  const { portalLogo: _portalLogo, ...settingsData } = body;
  const updateData = {
    ...settingsData,
    portalLogoUrl,
  };

  const settings = await prisma.systemSettings.upsert({
    where: { id: 'settings' },
    update: updateData,
    create: {
      id: 'settings',
      ...updateData,
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
    facultyName: settings.facultyName,
    maxLoginAttempts: settings.maxLoginAttempts,
    sessionExpiry: settings.sessionExpiry,
    allowedEmailDomain: settings.allowedEmailDomain,
    portalLogoUrl: settings.portalLogoUrl,
  });
});

export default settingsRouter;
