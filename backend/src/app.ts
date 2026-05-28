import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { getEnv } from './lib/env';
import { getLogger } from './lib/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { csrfOriginMiddleware } from './middleware/csrfOrigin';
import { rateLimit } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler';

import healthRouter from './routes/health';
import portfolioRouter from './routes/portfolio';
import postsRouter from './routes/posts';
import contactRouter from './routes/contact';
import authRouter from './routes/auth';
import adminPortfolioRouter from './routes/admin/portfolio';
import adminPostsRouter from './routes/admin/posts';
import adminContactRouter from './routes/admin/contact';
import adminUploadsRouter from './routes/admin/uploads';

export function createApp(): express.Application {
  const app = express();
  const env = getEnv();
  const log = getLogger();

  app.set('startedAt', new Date());
  app.set('trust proxy', 1);

  // ── CORS ──────────────────────────────────────────────────────────────────
  if (env.CORS_ORIGIN) {
    app.use(cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-Id'],
    }));
  }

  // ── Core middleware ────────────────────────────────────────────────────────
  app.use(express.json({ limit: '512kb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(pinoHttp({ logger: log }));

  // ── CSRF origin check (all mutating routes) ───────────────────────────────
  app.use('/api', csrfOriginMiddleware);

  // ── Global rate limit (DDOS guard) ────────────────────────────────────────
  app.use('/api', rateLimit({ scope: 'global', max: 120, windowSec: 60 }));

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  app.use('/api/portfolio', portfolioRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/auth', authRouter);

  // Admin routes — all require valid JWT cookie
  app.use('/api/admin/portfolio', authMiddleware, adminPortfolioRouter);
  app.use('/api/admin/posts', authMiddleware, adminPostsRouter);
  app.use('/api/admin/contact', authMiddleware, adminContactRouter);
  app.use('/api/admin/uploads', authMiddleware, adminUploadsRouter);

  // ── 404 + error handler ───────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
