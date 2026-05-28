import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../lib/env';
import { sendError } from './errorHandler';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export function csrfOriginMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers['origin'] as string | undefined;
  if (!origin) {
    return next();
  }

  const { NODE_ENV, CORS_ORIGIN } = getEnv();

  const allowedOrigin =
    NODE_ENV === 'development' && CORS_ORIGIN
      ? CORS_ORIGIN
      : `https://${req.hostname}`;

  if (origin !== allowedOrigin && NODE_ENV !== 'test') {
    sendError(res, 403, 'BAD_ORIGIN', 'Cross-origin requests are not allowed', { requestId: req.requestId });
    return;
  }

  next();
}
