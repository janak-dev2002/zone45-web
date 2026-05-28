import argon2 from 'argon2';
import { getPool } from './pool';
import { getEnv } from '../lib/env';
import { getLogger } from '../lib/logger';

export async function seedAdminUser(): Promise<void> {
  const env = getEnv();
  const log = getLogger();

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) {
    log.info('ADMIN_EMAIL or ADMIN_PASSWORD_HASH not set — skipping admin seed');
    return;
  }

  const pool = getPool();
  const { rows } = await pool.query<{ count: string }>('SELECT count(*)::text FROM admin_users');
  if (parseInt(rows[0].count, 10) > 0) {
    log.debug('Admin user already exists — skipping seed');
    return;
  }

  // Accept either a pre-hashed Argon2id string or a plaintext password from the env.
  // Production should always supply a pre-hashed value.
  let passwordHash = env.ADMIN_PASSWORD_HASH;
  if (!passwordHash.startsWith('$argon2')) {
    log.warn('ADMIN_PASSWORD_HASH does not look like an Argon2 hash — hashing it now');
    passwordHash = await argon2.hash(passwordHash, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  await pool.query(
    'INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)',
    [env.ADMIN_EMAIL, passwordHash, env.ADMIN_NAME ?? 'Admin'],
  );

  log.info({ email: env.ADMIN_EMAIL }, 'Admin user seeded');
}
