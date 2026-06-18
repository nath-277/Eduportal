import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateResetToken, hashResetToken } from '../lib/reset-token.js';
import { sanitizeUser, type SanitizedUser } from '../lib/sanitize.js';
import { authenticate } from '../middleware/auth.js';
import { badRequest, conflict, created, forbidden, notFound, ok, okMessage, unauthorized } from '../lib/response.js';
import { writeAudit } from '../lib/audit.js';
import { syncUserCommunities } from '../lib/community.js';
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

authRouter.post('/register', async (c) => {
  let body: RegisterInput;
  try {
    body = registerSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: body.email } });
  if (existingEmail) {
    return conflict('Email already in use');
  }

  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'settings' },
  });

  if (settings && settings.allowedEmailDomain) {
    const domains = settings.allowedEmailDomain
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    if (domains.length > 0) {
      const emailLower = body.email.trim().toLowerCase();
      const matchedDomain = domains.find(
        (d) => emailLower.endsWith(`@${d}`) || emailLower.endsWith(`.${d}`)
      );
      if (!matchedDomain) {
        return badRequest(
          `Email domain is not allowed. Allowed domains are: ${domains.join(', ')}`
        );
      }

      const studentDomains = domains.filter((d) => d.includes('student') || d.includes('std.'));
      const staffDomains = domains.filter((d) => !d.includes('student') && !d.includes('std.'));

      if (body.role === 'STUDENT') {
        if (studentDomains.length > 0) {
          const matchesStudent = studentDomains.some(
            (d) => emailLower.endsWith(`@${d}`) || emailLower.endsWith(`.${d}`)
          );
          if (!matchesStudent) {
            return badRequest(
              `Students must register with a student email domain (e.g. ${studentDomains.join(', ')}).`
            );
          }
        }
      } else {
        if (staffDomains.length > 0) {
          const matchesStaff = staffDomains.some(
            (d) => emailLower.endsWith(`@${d}`) || emailLower.endsWith(`.${d}`)
          );
          if (!matchesStaff) {
            return badRequest(
              `Staff members must register with a staff email domain (e.g. ${staffDomains.join(', ')}).`
            );
          }
        }
      }
    }
  }

  if (body.matricNumber) {
    const existingMatric = await prisma.user.findUnique({
      where: { matricNumber: body.matricNumber },
    });
    if (existingMatric) {
      return conflict('Matric number already in use');
    }
  }

  if (body.staffId) {
    const existingStaff = await prisma.user.findUnique({
      where: { staffId: body.staffId },
    });
    if (existingStaff) {
      return conflict('Staff ID already in use');
    }
  }

  const department = await prisma.department.findUnique({
    where: { id: body.departmentId },
  });
  if (!department) {
    return badRequest('Invalid department');
  }

  if (body.role === 'STUDENT') {
    if (!body.programmeId) {
      return badRequest('Programme is required for student registration');
    }
    const programme = await prisma.programme.findUnique({
      where: { id: body.programmeId },
    });
    if (!programme) {
      return badRequest('Invalid programme');
    }
    if (programme.departmentId !== body.departmentId) {
      return badRequest('Selected programme does not belong to the selected department');
    }
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
      programmeId: body.role === 'STUDENT' ? body.programmeId : undefined,
    },
  });

  await syncUserCommunities(user.id);

  const token = signToken({ userId: user.id, role: user.role });

  return created<{ user: SanitizedUser; token: string }>({
    user: sanitizeUser(user),
    token,
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
    return unauthorized('Invalid credentials');
  }

  const passwordOk = await comparePassword(body.password, user.passwordHash);
  if (!passwordOk) {
    return unauthorized('Invalid credentials');
  }

  if (!user.isActive) {
    return forbidden('Account suspended');
  }

  await writeAudit(c, {
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
  });

  const token = signToken({ userId: user.id, role: user.role });

  return ok<{ user: SanitizedUser; token: string }>({ user: sanitizeUser(user), token });
});

authRouter.post('/forgot-password', async (c) => {
  let body: ForgotPasswordInput;
  try {
    body = forgotPasswordSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const generic = okMessage('Reset instructions sent');

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return generic;
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

  return generic;
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
    return badRequest('Invalid or expired token');
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

  return okMessage('Password reset successful');
});

authRouter.get('/me', authenticate, async (c) => {
  const { userId } = c.get('user');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: true,
      programme: true,
    },
  });
  if (!user) {
    return notFound('User not found');
  }

  return ok<{ user: SanitizedUser }>({ user: sanitizeUser(user) });
});

authRouter.post('/logout', authenticate, async (c) => {
  const { userId } = c.get('user');

  await writeAudit(c, {
    userId,
    action: 'LOGOUT',
    entity: 'User',
    entityId: userId,
  });

  return okMessage('Logged out');
});

export default authRouter;
