import { Hono } from 'hono';
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

userRouter.patch('/:id', authenticate, authorize('ADMIN'), async (c) => {
  const { id } = c.req.param();
  let body: UpdateUserInput;
  try {
    body = updateUserSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
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

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'USER_UPDATE',
    entity: 'User',
    entityId: id,
    metadata: { fields: Object.keys(body) },
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

export default userRouter;
