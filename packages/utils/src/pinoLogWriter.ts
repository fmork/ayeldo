import pino, { type Logger as PinoLogger } from 'pino';
import { getRequestContext } from './requestContext';

/**
 * Minimal pino-backed logger with the same shape as ILogWriter
 * (debug, info, warn, error(text, error)).
 */
export class PinoLogWriter {
  private readonly logger: PinoLogger;

  public constructor(logger?: PinoLogger) {
    this.logger = logger ?? pino();
  }

  public debug(text: string): void {
    const ctx = getRequestContext();
    if (ctx) this.logger.debug({ requestId: ctx.requestId }, text);
    else this.logger.debug(text);
  }

  public info(text: string): void {
    const ctx = getRequestContext();
    if (ctx) this.logger.info({ requestId: ctx.requestId }, text);
    else this.logger.info(text);
  }

  public warn(text: string): void {
    const ctx = getRequestContext();
    if (ctx) this.logger.warn({ requestId: ctx.requestId }, text);
    else this.logger.warn(text);
  }

  public error(text: string, error: Error): void {
    const ctx = getRequestContext();
    if (ctx) this.logger.error({ err: error, requestId: ctx.requestId }, text);
    else this.logger.error(error, text);
  }

  /**
   * Create a child logger with bound fields.
   * Note: ILogWriter does not expose child; we keep this internal helper
   * to support request-scoped loggers without changing the interface.
   */
  public createChild(bindings: Record<string, unknown>): PinoLogWriter {
    const child = this.logger.child(bindings);
    return new PinoLogWriter(child);
  }
}
