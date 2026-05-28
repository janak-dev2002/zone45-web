import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../db/pool';
import { getRedis } from '../lib/redis';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const startedAt = (res.app.get('startedAt') as Date | undefined) ?? new Date();
  const uptimeSec = Math.floor((Date.now() - startedAt.getTime()) / 1000);

  const [dbOk, redisOk] = await Promise.all([
    checkDbConnection(),
    getRedis()
      .ping()
      .then(() => true)
      .catch(() => false),
  ]);

  const status = dbOk && redisOk ? 'ok' : 'degraded';
  const httpStatus = status === 'ok' ? 200 : 503;

  res.status(httpStatus).json({
    data: {
      status,
      version: '0.1.0',
      uptimeSec,
      checks: {
        db: dbOk ? 'ok' : 'fail',
        redis: redisOk ? 'ok' : 'fail',
      },
    },
  });
});

export default router;
