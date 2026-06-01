import { z } from 'zod';

export const listPostsSchema = z.object({
  tag: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListPostsQuery = z.infer<typeof listPostsSchema>;

export const createPostSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
  tags: z.array(z.string().min(1).max(30)).max(10).default([]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createReplySchema = z.object({
  body: z.string().min(1).max(5000),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
