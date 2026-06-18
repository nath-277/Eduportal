import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import {
  uploadBase64,
  deleteAsset,
  signedDownloadUrl,
  isCloudinaryConfigured,
} from '../lib/cloudinary.js';
import { parsePagination, paginated } from '../lib/pagination.js';
import { badRequest, forbidden, notFound, ok, serverError } from '../lib/response.js';
import {
  listResourcesSchema,
  createResourceSchema,
  type ListResourcesQuery,
  type CreateResourceInput,
} from '../validators/resource.validator.js';

const resourceRouter = new Hono();

resourceRouter.get('/', async (c) => {
  let query: ListResourcesQuery;
  try {
    query = listResourcesSchema.parse({
      courseId: c.req.query('courseId'),
      type: c.req.query('type'),
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

  const where: Record<string, unknown> = {};
  if (query.courseId) where.courseId = query.courseId;
  if (query.type) where.type = query.type;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, resources] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: { id: true, fullname: true, avatarUrl: true } },
        course: { select: { id: true, code: true, title: true } },
      },
    }),
  ]);

  return ok(paginated(resources, total, page, limit));
});

resourceRouter.post('/', authenticate, authorize('LECTURER', 'ADMIN'), async (c) => {
  let body: CreateResourceInput;
  try {
    body = createResourceSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  if (body.courseId) {
    const course = await prisma.course.findUnique({ where: { id: body.courseId } });
    if (!course) return badRequest('Invalid courseId');
  }

  if (!isCloudinaryConfigured()) {
    return badRequest(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
    );
  }

  let uploaded;
  try {
    uploaded = await uploadBase64(body.fileBase64, 'eduportal/resources', body.fileName);
  } catch (err) {
    console.error('Resource upload failed:', err);
    return serverError('Failed to upload file');
  }

  const resource = await prisma.resource.create({
    data: {
      title: body.title,
      description: body.description,
      type: body.type,
      courseId: body.courseId,
      fileUrl: uploaded.url,
      filePublicId: uploaded.publicId,
      fileType: body.fileType,
      fileSize: uploaded.bytes,
      uploadedById: c.get('user').userId,
    },
  });

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'RESOURCE_CREATE',
    entity: 'Resource',
    entityId: resource.id,
  });

  return c.json({ success: true, data: resource }, 201);
});

resourceRouter.delete('/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  const current = c.get('user');

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return notFound('Resource not found');

  if (current.role !== 'ADMIN' && resource.uploadedById !== current.userId) {
    return forbidden('You can only delete your own resources');
  }

  if (resource.filePublicId) {
    try {
      await deleteAsset(resource.filePublicId, resource.fileType);
    } catch (err) {
      console.warn('Cloudinary delete failed (continuing):', err);
    }
  }

  await prisma.resourceBookmark.deleteMany({ where: { resourceId: id } });
  await prisma.resource.delete({ where: { id } });

  await writeAudit(c, {
    userId: current.userId,
    action: 'RESOURCE_DELETE',
    entity: 'Resource',
    entityId: id,
  });

  return ok({ message: 'Resource deleted' });
});

resourceRouter.post('/:id/download', authenticate, async (c) => {
  const { id } = c.req.param();

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return notFound('Resource not found');

  await prisma.resource.update({
    where: { id },
    data: { downloadCount: { increment: 1 } },
  });

  let downloadUrl = resource.fileUrl;

  // Try to generate a properly signed download URL via Cloudinary
  if (resource.filePublicId && isCloudinaryConfigured()) {
    try {
      const signed = signedDownloadUrl(resource.filePublicId, resource.fileType);
      if (signed) downloadUrl = signed;
    } catch (err) {
      console.warn('Signed URL failed, falling back to fileUrl:', err);
    }
  }

  // If we're still using the raw fileUrl, inject fl_attachment to force download
  if (downloadUrl === resource.fileUrl && downloadUrl.includes('res.cloudinary.com')) {
    downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
  }

  await writeAudit(c, {
    userId: c.get('user').userId,
    action: 'RESOURCE_DOWNLOAD',
    entity: 'Resource',
    entityId: id,
  });

  return ok({ url: downloadUrl });
});

resourceRouter.post('/:id/bookmark', authenticate, authorize('STUDENT'), async (c) => {
  const { id } = c.req.param();
  const { userId } = c.get('user');

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return notFound('Resource not found');

  const existing = await prisma.resourceBookmark.findUnique({
    where: { resourceId_userId: { resourceId: id, userId } },
  });

  if (existing) {
    await prisma.resourceBookmark.delete({ where: { id: existing.id } });
    return ok({ bookmarked: false });
  }

  await prisma.resourceBookmark.create({ data: { resourceId: id, userId } });
  return ok({ bookmarked: true });
});

resourceRouter.get('/bookmarks/mine', authenticate, authorize('STUDENT'), async (c) => {
  const { userId } = c.get('user');
  const bookmarks = await prisma.resourceBookmark.findMany({
    where: { userId },
    include: {
      resource: {
        include: {
          uploader: { select: { id: true, fullname: true } },
          course: { select: { id: true, code: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return ok({ data: bookmarks.map((b) => b.resource) });
});

export default resourceRouter;
