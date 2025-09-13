import pino from 'pino';
/**
 * Minimal pino-backed logger with the same shape as ILogWriter
 * (debug, info, warn, error(text, error)).
 */
export class PinoLogWriter {
    logger;
    constructor(logger) {
        this.logger = logger ?? pino();
    }
    debug(text) {
        this.logger.debug(text);
    }
    info(text) {
        this.logger.info(text);
    }
    warn(text) {
        this.logger.warn(text);
    }
    error(text, error) {
        this.logger.error(error, text);
    }
    /**
     * Create a child logger with bound fields.
     * Note: ILogWriter does not expose child; we keep this internal helper
     * to support request-scoped loggers without changing the interface.
     */
    createChild(bindings) {
        const child = this.logger.child(bindings);
        return new PinoLogWriter(child);
    }
}
//# sourceMappingURL=pinoLogWriter.js.map