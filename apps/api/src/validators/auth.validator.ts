import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[A-Z])(?=.*[0-9])/, 'Password must contain uppercase and number');

export const registerSchema = z.object({
  fullname: z.string().min(3, 'Full name must be at least 3 characters').max(100),
  email: z.email('Invalid email address'),
  password: passwordSchema,
  matricNumber: z.string().min(1).optional(),
  staffId: z.string().min(1).optional(),
  role: z.enum(['STUDENT', 'LECTURER']).default('STUDENT'),
  level: z.enum(['L100', 'L200', 'L300', 'L400', 'L500', 'GRADUATED']).optional(),
  departmentId: z.string().min(1, 'Department is required'),
  programmeId: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or matric number is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
