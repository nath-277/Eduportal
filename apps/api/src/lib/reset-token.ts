import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 3;
const TOKEN_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomToken(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i] ?? 0;
    out += TOKEN_CHARSET[byte % TOKEN_CHARSET.length];
  }
  return out;
}

export function generateResetToken(): string {
  return randomToken(TOKEN_BYTES);
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
