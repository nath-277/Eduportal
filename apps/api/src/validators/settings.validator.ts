import { z } from 'zod';

export const updateSettingsSchema = z.object({
  portalName: z.string().min(1, 'Portal name is required').max(100),
  displayName: z.string().min(1, 'Display name is required').max(200),
  facultyName: z.string().min(1, 'Faculty name is required').max(200).optional(),
  maxLoginAttempts: z.coerce.number().int().min(1).max(20),
  sessionExpiry: z.string().min(1, 'Session expiry is required'),
  allowedEmailDomain: z.string().max(100).optional().transform(v => v ? v.trim().toLowerCase() : ''),
  portalLogo: z.string().optional(),
  portalLogoUrl: z.string().max(500).nullable().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
