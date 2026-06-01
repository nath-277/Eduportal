import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(5000),
  isPinned: z.boolean().default(false),
  targetRole: z.enum(['STUDENT', 'LECTURER', 'ADMIN']).nullable().optional(),
  scheduledAt: z.iso.datetime().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z
  .object({
    title: z.string().min(3).max(200).optional(),
    body: z.string().min(1).max(5000).optional(),
    isPinned: z.boolean().optional(),
    targetRole: z.enum(['STUDENT', 'LECTURER', 'ADMIN']).nullable().optional(),
    scheduledAt: z.iso.datetime().nullable().optional(),
    expiresAt: z.iso.datetime().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
