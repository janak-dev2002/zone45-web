import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getEnv } from './env';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
}

function parseTtlSec(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return val;
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 24 * 3600;
    default: return 900;
  }
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const { JWT_SECRET, JWT_ACCESS_TTL } = getEnv();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: parseTtlSec(JWT_ACCESS_TTL) });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const { JWT_SECRET } = getEnv();
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTtlSeconds(): number {
  const { JWT_REFRESH_TTL } = getEnv();
  const match = JWT_REFRESH_TTL.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val;
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 24 * 3600;
    default: return 7 * 24 * 3600;
  }
}
