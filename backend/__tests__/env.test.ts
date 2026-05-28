import { getEnv, resetEnvCache } from '../src/lib/env';

describe('getEnv', () => {
  afterEach(() => resetEnvCache());

  it('parses all required env vars from process.env', () => {
    const env = getEnv();
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(8080);
    expect(env.JWT_SECRET).toBeDefined();
    expect(env.RESEND_API_KEY).toBeDefined();
  });

  it('caches the result on repeated calls', () => {
    const e1 = getEnv();
    const e2 = getEnv();
    expect(e1).toBe(e2);
  });

  it('resets cache and reparses after resetEnvCache', () => {
    const e1 = getEnv();
    resetEnvCache();
    const e2 = getEnv();
    expect(e1).not.toBe(e2);
    expect(e1.PORT).toBe(e2.PORT);
  });

  it('throws when a required var is missing', () => {
    resetEnvCache();
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => getEnv()).toThrow();
    process.env.JWT_SECRET = original;
  });
});
