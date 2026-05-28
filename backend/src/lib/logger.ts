import pino from 'pino';
import { getEnv } from './env';

let _logger: pino.Logger | undefined;

export function getLogger(): pino.Logger {
  if (!_logger) {
    const { LOG_LEVEL, NODE_ENV } = getEnv();
    _logger = pino({
      level: LOG_LEVEL,
      ...(NODE_ENV === 'development' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    });
  }
  return _logger;
}

export function resetLogger(): void {
  _logger = undefined;
}
