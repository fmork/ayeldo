import { type Logger as PinoLogger } from 'pino';
/**
 * Minimal pino-backed logger with the same shape as ILogWriter
 * (debug, info, warn, error(text, error)).
 */
export declare class PinoLogWriter {
    private readonly logger;
    constructor(logger?: PinoLogger);
    debug(text: string): void;
    info(text: string): void;
    warn(text: string): void;
    error(text: string, error: Error): void;
    /**
     * Create a child logger with bound fields.
     * Note: ILogWriter does not expose child; we keep this internal helper
     * to support request-scoped loggers without changing the interface.
     */
    createChild(bindings: Record<string, unknown>): PinoLogWriter;
}
//# sourceMappingURL=pinoLogWriter.d.ts.map