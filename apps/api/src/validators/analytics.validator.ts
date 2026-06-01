import { z } from 'zod';

export const auditLogsQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
