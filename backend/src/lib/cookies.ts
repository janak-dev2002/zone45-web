import { CookieOptions } from 'express';
import { getEnv } from './env';

export function cookieOptions(): CookieOptions {
  const { NODE_ENV } = getEnv();
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: NODE_ENV === 'production',
  };
}

export function refreshCookieOptions(): CookieOptions {
  return {
    ...cookieOptions(),
    path: '/api/auth',
  };
}
