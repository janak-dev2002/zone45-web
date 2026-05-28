import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  verifyAccessToken,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTtlSeconds,
  AccessTokenPayload,
} from '../lib/jwt';
import { getRedis } from '../lib/redis';
import { getPool } from '../db/pool';
import { getEnv } from '../lib/env';
import { sendError } from './errorHandler';
import { cookieOptions, refreshCookieOptions } from '../lib/cookies';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const accessToken: string | undefined = req.cookies?.zf45_at;
  const refreshToken: string | undefined = req.cookies?.zf45_rt;

  if (!accessToken) {
    sendError(res, 401, 'UNAUTHENTICATED', 'Authentication required', { requestId: req.requestId });
    return;
  }

  try {
    req.user = verifyAccessToken(accessToken);
    return next();
  } catch (err) {
    if (!(err instanceof jwt.TokenExpiredError)) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Invalid token', { requestId: req.requestId });
      return;
    }
  }

  // Access token expired — attempt silent refresh
  if (!refreshToken) {
    sendError(res, 401, 'UNAUTHENTICATED', 'Session expired', { requestId: req.requestId });
    return;
  }

  const hash = hashRefreshToken(refreshToken);
  const redis = getRedis();
  const userId = await redis.get(`rt:${hash}`);

  if (!userId) {
    clearAuthCookies(res);
    sendError(res, 401, 'UNAUTHENTICATED', 'Session expired or revoked', { requestId: req.requestId });
    return;
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string; email: string; name: string }>(
    'SELECT id, email, name FROM admin_users WHERE id = $1',
    [userId],
  );

  if (rows.length === 0) {
    await redis.del(`rt:${hash}`);
    clearAuthCookies(res);
    sendError(res, 401, 'SESSION_INVALID', 'User no longer exists', { requestId: req.requestId });
    return;
  }

  const user = rows[0];
  const newAccessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  const newRefreshToken = generateRefreshToken();
  const newHash = hashRefreshToken(newRefreshToken);

  await redis.del(`rt:${hash}`);
  await redis.setex(`rt:${newHash}`, refreshTtlSeconds(), user.id);

  res.cookie('zf45_at', newAccessToken, cookieOptions());
  res.cookie('zf45_rt', newRefreshToken, refreshCookieOptions());

  req.user = { sub: user.id, email: user.email, name: user.name };
  next();
}

export function clearAuthCookies(res: Response): void {
  const { NODE_ENV } = getEnv();
  const base = { httpOnly: true, sameSite: 'strict' as const, path: '/' };
  const secure = NODE_ENV === 'production' ? { secure: true } : {};
  res.clearCookie('zf45_at', { ...base, ...secure });
  res.clearCookie('zf45_rt', { ...base, ...secure });
}
