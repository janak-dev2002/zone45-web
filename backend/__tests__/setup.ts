// Set all required env vars before any module is imported during tests.
// Tests use mocked db/redis/external services — these values are never
// used to make real network calls.

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_chars_long_padding';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_padding';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '7d';
process.env.RESEND_API_KEY = 're_test_key';
process.env.EMAIL_FROM = 'noreply@zoneforty5.tech';
process.env.EMAIL_TO = 'hello@zoneforty5.tech';
process.env.TURNSTILE_SECRET = '1x0000000000000000000000000000000AA';
process.env.R2_ACCOUNT_ID = 'test_account';
process.env.R2_ACCESS_KEY_ID = 'test_key_id';
process.env.R2_SECRET_ACCESS_KEY = 'test_secret';
process.env.R2_BUCKET = 'zf45-uploads';
process.env.R2_PUBLIC_BASE = 'https://cdn.zoneforty5.tech';
process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
process.env.LOG_LEVEL = 'silent';
