import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTtlSeconds,
} from '../src/lib/jwt';

describe('JWT utilities', () => {
  const payload = { sub: 'user-uuid-123', email: 'admin@test.com', name: 'Admin' };

  it('signs and verifies an access token', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
  });

  it('throws on invalid token', () => {
    expect(() => verifyAccessToken('not.a.valid.token')).toThrow();
  });

  it('generates unique refresh tokens', () => {
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    expect(t1).not.toBe(t2);
    expect(t1).toHaveLength(64); // 32 bytes hex
  });

  it('produces consistent hash for same token', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('produces different hashes for different tokens', () => {
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    expect(hashRefreshToken(t1)).not.toBe(hashRefreshToken(t2));
  });

  it('returns correct TTL seconds for 7d', () => {
    expect(refreshTtlSeconds()).toBe(7 * 24 * 3600);
  });
});
