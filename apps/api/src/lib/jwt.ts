import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { config } from '../config.js';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface JwtPayloadInput {
  userId: string;
  role: UserRole;
}

export function signToken(payload: JwtPayloadInput): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }
  const { userId, role, iat, exp } = decoded as Record<string, unknown>;
  if (typeof userId !== 'string' || typeof role !== 'string') {
    throw new Error('Invalid token payload');
  }
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    throw new Error('Invalid token payload');
  }
  if (role !== 'STUDENT' && role !== 'LECTURER' && role !== 'ADMIN') {
    throw new Error('Invalid role in token');
  }
  return { userId, role, iat, exp };
}
