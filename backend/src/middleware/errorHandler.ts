import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { getLogger } from '../lib/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', 'The requested resource does not exist');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function globalErrorHandler(err: ApiError, req: Request, res: Response, _next: NextFunction): void {
  const log = getLogger();

  if (err instanceof ZodError) {
    const details = err.errors.reduce<Record<string, string>>((acc, e) => {
      acc[e.path.join('.')] = e.message;
      return acc;
    }, {});
    sendError(res, 422, 'VALIDATION_FAILED', 'Validation failed', { ...details, requestId: req.requestId });
    return;
  }

  const status = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  if (status >= 500) {
    log.error({ err, requestId: req.requestId }, 'Unhandled error');
  }

  sendError(res, status, code, err.message || 'An unexpected error occurred', {
    requestId: req.requestId,
  });
}

export function createError(message: string, statusCode: number, code: string): ApiError {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
