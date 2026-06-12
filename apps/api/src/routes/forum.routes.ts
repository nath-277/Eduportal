import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { parsePagination, paginated } from '../lib/pagination.js';
import { forbidden, notFound, ok, serverError } from '../lib/response.js';
import { uploadBase64, isCloudinaryConfigured } from '../lib/cloudinary.js';
import {
  listPostsSchema,
  createPostSchema,
  createReplySchema,
  updatePostSchema,
  type ListPostsQuery,
  type CreatePostInput,
  type CreateReplyInput,
  type UpdatePostInput,
} from '../validators/forum.validator.js';

const forumRouter = new Hono();

forumRouter.get('/posts', async (c) => {
  let query: ListPostsQuery;
  try {
    query = listPostsSchema.parse({
      tag: c.req.query('tag'),
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
  if (query.tag) where.tags = { has: query.tag };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { body: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, posts] = await Promise.all([
    prisma.forumPost.count({ where }),
    prisma.forumPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, fullname: true, avatarUrl: true, role: true } },
        _count: { select: { replies: true } },
      },
    }),
  ]);

  return ok(
    paginated(
      posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        tags: p.tags,
        likesCount: p.likesCount,
        views: p.views,
        isPinned: p.isPinned,
        imageUrl: p.imageUrl ?? undefined,
        author: p.author,
        replyCount: p._count.replies,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
      page,
      limit
    )
  );
});

forumRouter.post('/posts', authenticate, async (c) => {
  let body: CreatePostInput;
  try {
    body = createPostSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  let imageUrl = body.imageUrl;
  if (imageUrl && imageUrl.startsWith('data:')) {
    if (isCloudinaryConfigured()) {
      try {
        const uploaded = await uploadBase64(imageUrl, 'eduportal/forum');
        imageUrl = uploaded.url;
      } catch (err) {
        console.error('Forum post image upload failed:', err);
        return serverError('Failed to upload image');
      }
    } else {
      console.warn('Cloudinary not configured; storing base64 image directly in database');
    }
  }

  const post = await prisma.forumPost.create({
    data: {
      title: body.title,
      body: body.body,
      tags: body.tags,
      imageUrl,
      authorId: c.get('user').userId,
    },
    include: { author: { select: { id: true, fullname: true, avatarUrl: true, role: true } } },
  });

  return c.json({ success: true, data: post }, 201);
});

forumRouter.get('/posts/:id', async (c) => {
  const { id } = c.req.param();

  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, fullname: true, avatarUrl: true, role: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, fullname: true, avatarUrl: true, role: true } } },
      },
    },
  });
  if (!post) return notFound('Post not found');

  await prisma.forumPost.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  return ok(post);
});

forumRouter.post('/posts/:id/replies', authenticate, async (c) => {
  const { id } = c.req.param();
  let body: CreateReplyInput;
  try {
    body = createReplySchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post) return notFound('Post not found');

  const reply = await prisma.forumReply.create({
    data: {
      body: body.body,
      postId: id,
      authorId: c.get('user').userId,
    },
    include: { author: { select: { id: true, fullname: true, avatarUrl: true, role: true } } },
  });

  if (post.authorId !== c.get('user').userId) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        category: 'FORUM',
        title: 'New reply to your post',
        message: `Someone replied to "${post.title}"`,
        link: `/forum/${post.id}`,
      },
    });
  }

  return c.json({ success: true, data: reply }, 201);
});

forumRouter.patch('/posts/:id/like', authenticate, async (c) => {
  const { id } = c.req.param();
  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post) return notFound('Post not found');

  await prisma.forumPost.update({
    where: { id },
    data: { likesCount: { increment: 1 } },
  });

  return ok({ likesCount: post.likesCount + 1 });
});

forumRouter.patch('/posts/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  const current = c.get('user');

  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post) return notFound('Post not found');

  if (current.role !== 'ADMIN' && post.authorId !== current.userId) {
    return forbidden('You can only modify your own posts');
  }

  let body: UpdatePostInput;
  try {
    body = updatePostSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  let imageUrl = body.imageUrl;
  if (imageUrl && imageUrl.startsWith('data:')) {
    if (isCloudinaryConfigured()) {
      try {
        const uploaded = await uploadBase64(imageUrl, 'eduportal/forum');
        imageUrl = uploaded.url;
      } catch (err) {
        console.error('Forum post image upload failed:', err);
        return serverError('Failed to upload image');
      }
    }
  }

  const updated = await prisma.forumPost.update({
    where: { id },
    data: {
      title: body.title,
      body: body.body,
      tags: body.tags,
      imageUrl: imageUrl,
    },
  });

  await writeAudit(c, {
    userId: current.userId,
    action: 'FORUM_POST_UPDATE',
    entity: 'ForumPost',
    entityId: id,
  });

  return ok({ post: updated });
});

forumRouter.delete('/posts/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  const current = c.get('user');

  const post = await prisma.forumPost.findUnique({ where: { id } });
  if (!post) return notFound('Post not found');

  if (current.role !== 'ADMIN' && post.authorId !== current.userId) {
    return forbidden('You can only delete your own posts');
  }

  try {
    await prisma.forumPost.delete({ where: { id } });
  } catch (_err) {
    return serverError('Failed to delete post');
  }

  await writeAudit(c, {
    userId: current.userId,
    action: 'FORUM_POST_DELETE',
    entity: 'ForumPost',
    entityId: id,
  });

  return ok({ message: 'Post deleted' });
});

export default forumRouter;
