import { Pool } from 'pg';
import { getEnv } from '../lib/env';
import { getLogger } from '../lib/logger';

let _pool: Pool | undefined;

export function getPool(): Pool {
  if (!_pool) {
    const { DATABASE_URL } = getEnv();
    _pool = new Pool({ connectionString: DATABASE_URL, max: 10 });
    _pool.on('error', (err) => getLogger().error({ err }, 'pg pool idle client error'));
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = undefined;
  }
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}
