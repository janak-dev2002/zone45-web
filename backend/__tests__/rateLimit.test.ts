import { Request, Response, NextFunction } from 'express';
import { rateLimit } from '../src/middleware/rateLimit';

function makeReq(ip = '127.0.0.1'): Partial<Request> {
  return {
    headers: {},
    socket: { remoteAddress: ip } as Request['socket'],
    requestId: 'test-id',
  };
}

function makeRes(): { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock } {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
  return res;
}

// Mock redis before importing
const mockPipeline = {
  incr: jest.fn().mockReturnThis(),
  ttl: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockRedis = {
  pipeline: jest.fn(() => mockPipeline),
  expire: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
};

jest.mock('../src/lib/redis', () => ({
  getRedis: jest.fn(() => mockRedis),
}));

jest.mock('../src/lib/logger', () => ({
  getLogger: jest.fn(() => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() })),
}));

describe('rateLimit middleware', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPipeline.exec.mockResolvedValue([[null, 1], [null, -1]]);
  });

  it('calls next when under limit', async () => {
    const middleware = rateLimit({ scope: 'test', max: 5, windowSec: 60 });
    await middleware(makeReq() as Request, makeRes() as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 429 when over limit', async () => {
    mockPipeline.exec.mockResolvedValue([[null, 10], [null, 30]]);
    const middleware = rateLimit({ scope: 'test', max: 5, windowSec: 60 });
    const res = makeRes();
    await middleware(makeReq() as Request, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next on redis failure (fail open)', async () => {
    mockPipeline.exec.mockRejectedValue(new Error('Redis down'));
    const middleware = rateLimit({ scope: 'test', max: 5, windowSec: 60 });
    await middleware(makeReq() as Request, makeRes() as unknown as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('sets rate limit headers', async () => {
    const middleware = rateLimit({ scope: 'test', max: 5, windowSec: 60 });
    const res = makeRes();
    await middleware(makeReq() as Request, res as unknown as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
  });

  it('uses X-Forwarded-For header for client IP', async () => {
    const req = {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
      socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
      requestId: 'test-id',
    };
    const middleware = rateLimit({ scope: 'test', max: 5, windowSec: 60 });
    await middleware(req as unknown as Request, makeRes() as unknown as Response, next);
    expect(mockRedis.pipeline).toHaveBeenCalled();
    // Verify next was called (didn't error)
    expect(next).toHaveBeenCalled();
  });
});
