import { z } from 'zod';

export const createProgrammeSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).regex(/^[A-Z]{2,5}$/, 'Code must be uppercase letters (2-5 characters)'),
  description: z.string().max(500).optional(),
  departmentId: z.string().min(1, 'Department ID is required'),
});

export type CreateProgrammeInput = z.infer<typeof createProgrammeSchema>;

export const updateProgrammeSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    code: z.string().min(2).max(10).regex(/^[A-Z]{2,5}$/, 'Code must be uppercase letters (2-5 characters)').optional(),
    description: z.string().max(500).nullable().optional(),
    departmentId: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateProgrammeInput = z.infer<typeof updateProgrammeSchema>;

export const listProgrammesSchema = z.object({
  departmentId: z.string().optional(),
});

export type ListProgrammesQuery = z.infer<typeof listProgrammesSchema>;
