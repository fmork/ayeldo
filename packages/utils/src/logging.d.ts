import type { PinoLogWriter } from './pinoLogWriter';
export declare function createRootLogger(
  serviceName: string,
  level?: 'debug' | 'info' | 'warn' | 'error',
): PinoLogWriter;
export declare function withRequestId(logger: PinoLogWriter, requestId: string): PinoLogWriter;
//# sourceMappingURL=logging.d.ts.map
