import { z } from 'zod';

const scoreSchema = z.number().min(0).max(100);

export const uploadResultEntrySchema = z.object({
  matricNumber: z.string().min(1),
  caScore: scoreSchema,
  examScore: scoreSchema,
});

export const uploadResultsSchema = z.object({
  courseId: z.string().min(1),
  sessionId: z.string().min(1),
  semester: z.enum(['FIRST', 'SECOND']),
  results: z.array(uploadResultEntrySchema).min(1).max(500),
});

export type UploadResultEntry = z.infer<typeof uploadResultEntrySchema>;
export type UploadResultsInput = z.infer<typeof uploadResultsSchema>;

export const csvUploadSchema = z.object({
  courseId: z.string().min(1),
  sessionId: z.string().min(1),
  semester: z.enum(['FIRST', 'SECOND']),
  csv: z.string().min(1),
});

export type CsvUploadInput = z.infer<typeof csvUploadSchema>;

export const myResultsQuerySchema = z.object({
  sessionId: z.string().optional(),
  semester: z.enum(['FIRST', 'SECOND']).optional(),
});

export type MyResultsQuery = z.infer<typeof myResultsQuerySchema>;
