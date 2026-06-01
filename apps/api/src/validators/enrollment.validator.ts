import { z } from 'zod';

export const createEnrollmentsSchema = z.object({
  courseIds: z.array(z.string().min(1)).min(1).max(20),
  semester: z.enum(['FIRST', 'SECOND']),
  sessionId: z.string().min(1),
});

export type CreateEnrollmentsInput = z.infer<typeof createEnrollmentsSchema>;
