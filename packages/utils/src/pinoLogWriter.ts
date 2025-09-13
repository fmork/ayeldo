import pino, { type Logger as PinoLogger } from 'pino';

/**
 * Minimal pino-backed logger with the same shape as ILogWriter
 * (debug, info, warn, error(text, error)).
 */
export class PinoLogWriter {
  private readonly logger: PinoLogger;

  constructor(logger?: PinoLogger) {
    this.logger = logger ?? pino();
  }

  debug(text: string): void {
    this.logger.debug(text);
  }

  info(text: string): void {
    this.logger.info(text);
  }

  warn(text: string): void {
    this.logger.warn(text);
  }

  error(text: string, error: Error): void {
    this.logger.error(error, text);
  }

  /**
   * Create a child logger with bound fields.
   * Note: ILogWriter does not expose child; we keep this internal helper
   * to support request-scoped loggers without changing the interface.
   */
  createChild(bindings: Record<string, unknown>): PinoLogWriter {
    const child = this.logger.child(bindings);
    return new PinoLogWriter(child);
  }
}

