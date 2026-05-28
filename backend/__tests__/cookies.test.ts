import { cookieOptions, refreshCookieOptions } from '../src/lib/cookies';
import { resetEnvCache } from '../src/lib/env';

describe('cookie options', () => {
  afterEach(() => resetEnvCache());

  it('sets httpOnly and sameSite=strict', () => {
    const opts = cookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('strict');
  });

  it('does not set secure in test/dev mode', () => {
    const opts = cookieOptions();
    expect(opts.secure).toBe(false);
  });

  it('refresh cookie uses /api/auth path', () => {
    const opts = refreshCookieOptions();
    expect(opts.path).toBe('/api/auth');
  });

  it('access cookie uses / path', () => {
    const opts = cookieOptions();
    expect(opts.path).toBe('/');
  });
});
