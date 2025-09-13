import pino from 'pino';
import { PinoLogWriter } from './pinoLogWriter';

export function createRootLogger(serviceName: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): PinoLogWriter {
  const base = pino({ level, base: { service: serviceName } });
  return new PinoLogWriter(base);
}

export function withRequestId(logger: PinoLogWriter, requestId: string): PinoLogWriter {
  return logger.createChild({ requestId });
}
