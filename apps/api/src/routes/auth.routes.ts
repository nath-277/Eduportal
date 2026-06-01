import { Hono } from 'hono';
import type { ApiResponse } from '@eduportal/shared';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateResetToken, hashResetToken } from '../lib/reset-token.js';
import { sanitizeUser, type SanitizedUser } from '../lib/sanitize.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '../validators/auth.validator.js';

const RESET_EXPIRY_MS = 60 * 60 * 1000;

const authRouter = new Hono();

function jsonResponse<T>(status: number, body: ApiResponse<T>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

authRouter.post('/register', async (c) => {
  let body: RegisterInput;
  try {
    body = registerSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: body.email } });
  if (existingEmail) {
    return jsonResponse(409, { success: false, message: 'Email already in use' });
  }

  if (body.matricNumber) {
    const existingMatric = await prisma.user.findUnique({
      where: { matricNumber: body.matricNumber },
    });
    if (existingMatric) {
      return jsonResponse(409, { success: false, message: 'Matric number already in use' });
    }
  }

  if (body.staffId) {
    const existingStaff = await prisma.user.findUnique({
      where: { staffId: body.staffId },
    });
    if (existingStaff) {
      return jsonResponse(409, { success: false, message: 'Staff ID already in use' });
    }
  }

  const department = await prisma.department.findUnique({
    where: { id: body.departmentId },
  });
  if (!department) {
    return jsonResponse(400, { success: false, message: 'Invalid department' });
  }

  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      fullname: body.fullname,
      email: body.email,
      passwordHash,
      role: body.role,
      matricNumber: body.matricNumber,
      staffId: body.staffId,
      level: body.level,
      departmentId: body.departmentId,
    },
  });

  const token = signToken({ userId: user.id, role: user.role });

  return jsonResponse<{ user: SanitizedUser; token: string }>(201, {
    success: true,
    data: { user: sanitizeUser(user), token },
  });
});

authRouter.post('/login', async (c) => {
  let body: LoginInput;
  try {
    body = loginSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const identifier = body.identifier.trim();
  const isEmail = identifier.includes('@');

  const user = await prisma.user.findFirst({
    where: isEmail ? { email: identifier } : { matricNumber: identifier },
  });

  if (!user) {
    return jsonResponse(401, { success: false, message: 'Invalid credentials' });
  }

  const passwordOk = await comparePassword(body.password, user.passwordHash);
  if (!passwordOk) {
    return jsonResponse(401, { success: false, message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return jsonResponse(403, { success: false, message: 'Account suspended' });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: c.req.header('x-forwarded-for') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
    },
  });

  const token = signToken({ userId: user.id, role: user.role });

  return jsonResponse<{ user: SanitizedUser; token: string }>(200, {
    success: true,
    data: { user: sanitizeUser(user), token },
  });
});

authRouter.post('/forgot-password', async (c) => {
  let body: ForgotPasswordInput;
  try {
    body = forgotPasswordSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const generic: ApiResponse<null> = {
    success: true,
    message: 'Reset instructions sent',
  };

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return jsonResponse(200, generic);
  }

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const expiry = new Date(Date.now() + RESET_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiry: expiry,
    },
  });

  const resetLink = `${process.env.APP_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`;
  console.log(`[forgot-password] user=${user.email} token=${token} link=${resetLink}`);

  return jsonResponse(200, generic);
});

authRouter.post('/reset-password', async (c) => {
  let body: ResetPasswordInput;
  try {
    body = resetPasswordSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const tokenHash = hashResetToken(body.token);

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: tokenHash },
  });

  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    return jsonResponse(400, { success: false, message: 'Invalid or expired token' });
  }

  const newHash = await hashPassword(body.password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  return jsonResponse<null>(200, { success: true, message: 'Password reset successful' });
});

authRouter.get('/me', authenticate, async (c) => {
  const { userId } = c.get('user');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return jsonResponse(404, { success: false, message: 'User not found' });
  }

  return jsonResponse<{ user: SanitizedUser }>(200, {
    success: true,
    data: { user: sanitizeUser(user) },
  });
});

authRouter.post('/logout', authenticate, async (c) => {
  const { userId } = c.get('user');

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId,
      ipAddress: c.req.header('x-forwarded-for') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
    },
  });

  return jsonResponse<null>(200, { success: true, message: 'Logged out' });
});

export default authRouter;
