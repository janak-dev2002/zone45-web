import Redis from 'ioredis';
import { getEnv } from './env';
import { getLogger } from './logger';

let _redis: Redis | undefined;

export function getRedis(): Redis {
  if (!_redis) {
    const { REDIS_URL } = getEnv();
    _redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    _redis.on('error', (err) => getLogger().error({ err }, 'Redis error'));
  }
  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = undefined;
  }
}
