import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_NAME: z.string().optional(),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().default('noreply@zoneforty5.tech'),
  EMAIL_TO: z.string().email(),
  TURNSTILE_SECRET: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().default('zf45-uploads'),
  R2_PUBLIC_BASE: z.string().url(),
  R2_ENDPOINT: z.string().url(),
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REPO: z.string().default('janak-dev2002/zf45-website'),
});

export type Env = z.infer<typeof schema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (!_env) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`Missing/invalid environment variables:\n${result.error.toString()}`);
    }
    _env = result.data;
  }
  return _env;
}

export function resetEnvCache(): void {
  _env = undefined;
}
