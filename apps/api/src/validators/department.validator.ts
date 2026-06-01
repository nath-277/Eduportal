import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).regex(/^[A-Z]{2,5}$/, 'Code must be uppercase letters'),
  description: z.string().max(500).optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    code: z.string().min(2).max(10).regex(/^[A-Z]{2,5}$/).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const createSessionSchema = z
  .object({
    name: z.string().regex(/^\d{4}\/\d{4}$/, 'Name must look like 2024/2025'),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'startDate must be before endDate',
    path: ['endDate'],
  });

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
