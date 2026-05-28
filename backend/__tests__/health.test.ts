import request from 'supertest';
import express from 'express';

// Mock db and redis before importing app modules
jest.mock('../src/db/pool', () => ({
  getPool: jest.fn(),
  checkDbConnection: jest.fn().mockResolvedValue(true),
  closePool: jest.fn(),
}));

jest.mock('../src/lib/redis', () => ({
  getRedis: jest.fn(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
    pipeline: jest.fn(() => ({
      incr: jest.fn().mockReturnThis(),
      ttl: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1], [null, -1]]),
    })),
    expire: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    quit: jest.fn(),
  })),
  closeRedis: jest.fn(),
}));

// Also mock logger to suppress output
jest.mock('../src/lib/logger', () => ({
  getLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  resetLogger: jest.fn(),
}));

import healthRouter from '../src/routes/health';

describe('GET /api/health', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.set('startedAt', new Date());
    app.use('/api/health', healthRouter);
  });

  it('returns 200 when db and redis are healthy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.checks.db).toBe('ok');
    expect(res.body.data.checks.redis).toBe('ok');
    expect(typeof res.body.data.uptimeSec).toBe('number');
  });

  it('returns 503 when db is unhealthy', async () => {
    const { checkDbConnection } = require('../src/db/pool');
    (checkDbConnection as jest.Mock).mockResolvedValueOnce(false);

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.checks.db).toBe('fail');
  });
});
