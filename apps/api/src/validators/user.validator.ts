import { z } from 'zod';

export const listUsersSchema = z.object({
  role: z.enum(['STUDENT', 'LECTURER', 'ADMIN']).optional(),
  level: z.enum(['L100', 'L200', 'L300', 'L400', 'L500', 'GRADUATED']).optional(),
  departmentId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>;

export const updateUserSchema = z
  .object({
    fullname: z.string().min(3).max(100).optional(),
    level: z.enum(['L100', 'L200', 'L300', 'L400', 'L500', 'GRADUATED']).nullable().optional(),
    semester: z.enum(['FIRST', 'SECOND']).nullable().optional(),
    avatarUrl: z.url().nullable().optional(),
    isActive: z.boolean().optional(),
    role: z.enum(['STUDENT', 'LECTURER', 'ADMIN']).optional(),
    departmentId: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const avatarSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  folder: z.string().optional(),
});

export type AvatarInput = z.infer<typeof avatarSchema>;
