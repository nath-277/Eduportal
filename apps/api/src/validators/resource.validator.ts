import { z } from 'zod';

export const listResourcesSchema = z.object({
  courseId: z.string().optional(),
  type: z.enum(['LECTURE_NOTE', 'PAST_QUESTION', 'ASSIGNMENT', 'TEXTBOOK', 'OTHER']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListResourcesQuery = z.infer<typeof listResourcesSchema>;

export const createResourceSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['LECTURE_NOTE', 'PAST_QUESTION', 'ASSIGNMENT', 'TEXTBOOK', 'OTHER']),
  courseId: z.string().min(1).optional(),
  fileBase64: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
