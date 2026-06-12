import { Hono } from 'hono';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { uploadBase64, isCloudinaryConfigured } from '../lib/cloudinary.js';
import { sanitizeUser, type SanitizedUser } from '../lib/sanitize.js';
import { parsePagination, paginated } from '../lib/pagination.js';
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  okMessage,
  serverError,
} from '../lib/response.js';
import {
  listUsersSchema,
  updateUserSchema,
  avatarSchema,
  type ListUsersQuery,
  type UpdateUserInput,
  type AvatarInput,
} from '../validators/user.validator.js';
import { syncUserCommunities } from '../lib/community.js';
import { hashPassword, comparePassword } from '../lib/password.js';

const userRouter = new Hono();

userRouter.get('/', authenticate, authorize('ADMIN'), async (c) => {
  let query: ListUsersQuery;
  try {
    query = listUsersSchema.parse({
      role: c.req.query('role'),
      level: c.req.query('level'),
      departmentId: c.req.query('departmentId'),
      search: c.req.query('search'),
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

  const where: Prisma.UserWhereInput = {};
  if (query.role) where.role = query.role;
  if (query.level) where.level = query.level;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.search) {
    where.OR = [
      { fullname: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { matricNumber: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { department: true },
    }),
  ]);

  return ok(
    paginated(
      users.map((u) => ({
        ...sanitizeUser(u),
        department: u.department,
      })),
      total,
      page,
      limit
    )
  );
});

userRouter.get('/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  const current = c.get('user');

  if (current.role !== 'ADMIN' && current.userId !== id) {
    return forbidden('You can only view your own profile');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      department: true,
      _count: {
        select: {
          enrollments: true,
          results: true,
          uploadedResources: true,
        },
      },
    },
  });

  if (!user) return notFound('User not found');

  return ok({
    ...sanitizeUser(user),
    department: user.department,
    counts: user._count,
  });
});

userRouter.patch('/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  const current = c.get('user');
  const isSelf = current.userId === id;
  const isAdmin = current.role === 'ADMIN';

  if (!isAdmin && !isSelf) {
    return forbidden('You can only update your own profile');
  }

  let body: UpdateUserInput;
  try {
    body = updateUserSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  if (!isAdmin) {
    const allowedKeys = ['fullname', 'avatarUrl'];
    const attemptedFields = Object.keys(body).filter((k) => !allowedKeys.includes(k));
    if (attemptedFields.length > 0) {
      return forbidden(`You can only update: ${allowedKeys.join(', ')}`);
    }
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return notFound('User not found');

  if (body.departmentId !== undefined) {
    const dept = await prisma.department.findUnique({ where: { id: body.departmentId } });
    if (!dept) return badRequest('Invalid departmentId');
  }

  const user = await prisma.user.update({
    where: { id },
    data: body,
  });

  if (body.level !== undefined || body.departmentId !== undefined) {
    await syncUserCommunities(user.id);
  }

  await writeAudit(c, {
    userId: current.userId,
    action: 'USER_UPDATE',
    entity: 'User',
    entityId: id,
    metadata: { fields: Object.keys(body), self: isSelf },
  });

  return ok<{ user: SanitizedUser }>({ user: sanitizeUser(user) });
});

userRouter.delete('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  const current = c.get('user');

  if (current.userId === id) {
    return badRequest('You cannot delete your own account');
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return notFound('User not found');
  if (!existing.isActive) {
    return badRequest('User is already inactive');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await writeAudit(c, {
    userId: current.userId,
    action: 'USER_DEACTIVATE',
    entity: 'User',
    entityId: id,
  });

  return ok<{ user: SanitizedUser }>({ user: sanitizeUser(user) });
});

userRouter.patch('/:id/avatar', authenticate, async (c) => {
  const { id } = c.req.param();
  const current = c.get('user');

  if (current.userId !== id) {
    return forbidden('You can only update your own avatar');
  }

  let body: AvatarInput;
  try {
    body = avatarSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  if (!isCloudinaryConfigured()) {
    return badRequest(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
    );
  }

  let uploaded;
  try {
    uploaded = await uploadBase64(body.image, body.folder ?? `eduportal/avatars/${id}`);
  } catch (err) {
    console.error('Avatar upload failed:', err);
    return serverError('Failed to upload avatar');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { avatarUrl: uploaded.url },
  });

  return ok<{ avatarUrl: string; user: SanitizedUser }>({
    avatarUrl: uploaded.url,
    user: sanitizeUser(user),
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
});

userRouter.post('/me/change-password', authenticate, async (c) => {
  const current = c.get('user');
  let body: z.infer<typeof changePasswordSchema>;
  try {
    body = changePasswordSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const user = await prisma.user.findUnique({ where: { id: current.userId } });
  if (!user) return notFound('User not found');

  const okPassword = await comparePassword(body.currentPassword, user.passwordHash);
  if (!okPassword) return badRequest('Current password is incorrect');

  if (body.currentPassword === body.newPassword) {
    return badRequest('New password must be different from current password');
  }

  const passwordHash = await hashPassword(body.newPassword);
  await prisma.user.update({
    where: { id: current.userId },
    data: { passwordHash },
  });

  await writeAudit(c, {
    userId: current.userId,
    action: 'PASSWORD_CHANGE',
    entity: 'User',
    entityId: current.userId,
  });

  return okMessage('Password changed successfully');
});

const adminResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
});

userRouter.post('/:id/reset-password', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  let body: z.infer<typeof adminResetPasswordSchema>;
  try {
    body = adminResetPasswordSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return notFound('User not found');

  const passwordHash = await hashPassword(body.password);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  const current = c.get('user');
  await writeAudit(c, {
    userId: current.userId,
    action: 'ADMIN_PASSWORD_RESET',
    entity: 'User',
    entityId: id,
  });

  return okMessage('Password reset successfully');
});

export default userRouter;
