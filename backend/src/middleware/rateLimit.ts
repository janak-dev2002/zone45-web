import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../lib/redis';
import { sendError } from './errorHandler';

interface RateLimitOptions {
  scope: string;
  max: number;
  windowSec: number;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? '0.0.0.0';
}

export function rateLimit(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const redis = getRedis();
    const ip = getClientIp(req);
    const key = `ratelimit:${opts.scope}:${ip}`;

    try {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      if (!results) return next();

      const count = results[0][1] as number;
      const ttl = results[1][1] as number;

      if (ttl === -1) {
        await redis.expire(key, opts.windowSec);
      }

      const remaining = Math.max(0, opts.max - count);
      const retryAfter = ttl > 0 ? ttl : opts.windowSec;

      res.setHeader('X-RateLimit-Limit', opts.max);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (count > opts.max) {
        res.setHeader('Retry-After', retryAfter);
        sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again later.', {
          retryAfter,
          requestId: req.requestId,
        });
        return;
      }

      next();
    } catch {
      // Redis failure is non-fatal — let the request through
      next();
    }
  };
}

// Contact: 3/10min and 20/day per IP
export function contactRateLimit() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const redis = getRedis();
    const ip = getClientIp(req);

    try {
      const key10m = `ratelimit:contact:${ip}:10m`;
      const key1d = `ratelimit:contact:${ip}:1d`;

      const pipeline = redis.pipeline();
      pipeline.incr(key10m);
      pipeline.ttl(key10m);
      pipeline.incr(key1d);
      pipeline.ttl(key1d);
      const results = await pipeline.exec();

      if (!results) return next();

      const count10m = results[0][1] as number;
      const ttl10m = results[1][1] as number;
      const count1d = results[2][1] as number;
      const ttl1d = results[3][1] as number;

      if (ttl10m === -1) await redis.expire(key10m, 600);
      if (ttl1d === -1) await redis.expire(key1d, 86400);

      if (count10m > 3 || count1d > 20) {
        const retryAfter = count10m > 3 ? (ttl10m > 0 ? ttl10m : 600) : (ttl1d > 0 ? ttl1d : 86400);
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', 3);
        res.setHeader('X-RateLimit-Remaining', 0);
        sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please try again later.', {
          retryAfter,
          requestId: req.requestId,
        });
        return;
      }

      res.setHeader('X-RateLimit-Limit', 3);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, 3 - count10m));
      next();
    } catch {
      next();
    }
  };
}
