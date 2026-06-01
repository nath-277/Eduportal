import type { User } from '@prisma/client';

export type SanitizedUser = Omit<
  User,
  'passwordHash' | 'emailVerifyToken' | 'passwordResetToken'
>;

export function sanitizeUser(user: User): SanitizedUser {
  const { passwordHash: _ph, emailVerifyToken: _evt, passwordResetToken: _prt, ...rest } = user;
  return rest;
}
