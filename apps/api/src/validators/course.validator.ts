import { z } from 'zod';

export const listCoursesSchema = z.object({
  level: z.enum(['L100', 'L200', 'L300', 'L400', 'L500']).optional(),
  semester: z.enum(['FIRST', 'SECOND']).optional(),
  departmentId: z.string().optional(),
  programmeId: z.string().optional(),
  studentId: z.string().optional(),
});

export type ListCoursesQuery = z.infer<typeof listCoursesSchema>;

export const createCourseSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z]{2,4}\d{3}$/, 'Code must look like CSC101'),
  title: z.string().min(3).max(150),
  creditUnits: z.number().int().min(1).max(6),
  level: z.enum(['L100', 'L200', 'L300', 'L400', 'L500']),
  semester: z.enum(['FIRST', 'SECOND']),
  description: z.string().max(2000).optional(),
  departmentId: z.string().min(1),
  programmeId: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z
  .object({
    title: z.string().min(3).max(150).optional(),
    creditUnits: z.number().int().min(1).max(6).optional(),
    level: z.enum(['L100', 'L200', 'L300', 'L400', 'L500']).optional(),
    semester: z.enum(['FIRST', 'SECOND']).optional(),
    description: z.string().max(2000).nullable().optional(),
    departmentId: z.string().min(1).optional(),
    programmeId: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const assignCourseSchema = z.object({
  lecturerId: z.string().min(1),
  session: z.string().min(1),
});

export type AssignCourseInput = z.infer<typeof assignCourseSchema>;
