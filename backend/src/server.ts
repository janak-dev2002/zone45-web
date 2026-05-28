import { getEnv } from './lib/env';
import { getLogger } from './lib/logger';
import { closePool } from './db/pool';
import { closeRedis } from './lib/redis';
import { seedAdminUser } from './db/seed';
import { startEmailRetryJob } from './jobs/emailRetry';
import { createApp } from './app';

async function main(): Promise<void> {
  const env = getEnv();
  const log = getLogger();

  await seedAdminUser();

  const app = createApp();
  const job = startEmailRetryJob();

  const server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT, env: env.NODE_ENV }, 'API server started');
  });

  async function shutdown(signal: string): Promise<void> {
    log.info({ signal }, 'Shutdown signal received');
    job.stop();
    server.close(async () => {
      await Promise.allSettled([closePool(), closeRedis()]);
      log.info('Graceful shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      log.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
