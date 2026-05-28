import { Router, Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { getPool } from '../db/pool';
import { getRedis } from '../lib/redis';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTtlSeconds,
} from '../lib/jwt';
import { cookieOptions, refreshCookieOptions } from '../lib/cookies';
import { loginBodySchema } from '../lib/schemas';
import { authMiddleware, clearAuthCookies } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { sendError } from '../middleware/errorHandler';
import { verifyTurnstile } from '../services/turnstile';
import { getLogger } from '../lib/logger';

const router = Router();

interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  last_login_at: Date | null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? '0.0.0.0';
}

// POST /auth/login
router.post(
  '/login',
  rateLimit({ scope: 'login', max: 5, windowSec: 600 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginBodySchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 422, 'VALIDATION_FAILED', 'Validation failed');
        return;
      }

      const { email, password, turnstileToken } = parsed.data;
      const ip = getClientIp(req);

      const valid = await verifyTurnstile(turnstileToken, ip);
      if (!valid) {
        sendError(res, 422, 'VALIDATION_FAILED', 'Bot verification failed', { field: 'turnstileToken' });
        return;
      }

      const pool = getPool();
      const { rows } = await pool.query<AdminUserRow>(
        'SELECT id, email, password_hash, name, last_login_at FROM admin_users WHERE email = $1',
        [email.toLowerCase()],
      );

      // Always run verify even if user not found (timing-safe)
      const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysalt$dummyhashvaluepadded';
      const hashToVerify = rows[0]?.password_hash ?? dummyHash;

      let passwordValid = false;
      try {
        passwordValid = await argon2.verify(hashToVerify, password);
      } catch {
        // hash may be invalid — treat as bad password
      }

      if (rows.length === 0 || !passwordValid) {
        sendError(res, 401, 'UNAUTHENTICATED', 'Invalid email or password');
        return;
      }

      const user = rows[0];
      const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
      const refreshToken = generateRefreshToken();
      const hash = hashRefreshToken(refreshToken);

      await getRedis().setex(`rt:${hash}`, refreshTtlSeconds(), user.id);

      res.cookie('zf45_at', accessToken, cookieOptions());
      res.cookie('zf45_rt', refreshToken, refreshCookieOptions());

      await pool.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [user.id]);

      getLogger().info({ userId: user.id, ip }, 'Admin login');

      res.json({ data: { user: { id: user.id, email: user.email, name: user.name } } });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/refresh
router.post(
  '/refresh',
  rateLimit({ scope: 'refresh', max: 30, windowSec: 600 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken: string | undefined = req.cookies?.zf45_rt;
      if (!refreshToken) {
        sendError(res, 401, 'UNAUTHENTICATED', 'Refresh token missing');
        return;
      }

      const hash = hashRefreshToken(refreshToken);
      const redis = getRedis();
      const userId = await redis.get(`rt:${hash}`);

      if (!userId) {
        clearAuthCookies(res);
        sendError(res, 401, 'UNAUTHENTICATED', 'Refresh token expired or revoked');
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
        sendError(res, 401, 'SESSION_INVALID', 'User no longer exists');
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

      res.json({ data: { refreshed: true } });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/logout
router.post('/logout', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken: string | undefined = req.cookies?.zf45_rt;
    if (refreshToken) {
      const hash = hashRefreshToken(refreshToken);
      await getRedis().del(`rt:${hash}`).catch(() => null);
    }

    clearAuthCookies(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ id: string; email: string; name: string; last_login_at: Date | null }>(
      'SELECT id, email, name, last_login_at FROM admin_users WHERE id = $1',
      [req.user!.sub],
    );

    if (rows.length === 0) {
      sendError(res, 401, 'SESSION_INVALID', 'User no longer exists');
      return;
    }

    const u = rows[0];
    res.json({ data: { id: u.id, email: u.email, name: u.name, lastLoginAt: u.last_login_at } });
  } catch (err) {
    next(err);
  }
});

export default router;
