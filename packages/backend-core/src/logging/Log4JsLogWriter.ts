import type { Logger } from 'log4js';
import type { ILogWriter } from './ILogWriter';

interface Log4JsLogWriterConstructorParameters {
  logger: Logger;
}

export class Log4JsLogWriter implements ILogWriter {
  constructor(private readonly params: Log4JsLogWriterConstructorParameters) {}
  debug(text: string): void {
    if (this.params.logger.isDebugEnabled()) {
      this.params.logger.debug(text);
    }
  }
  info(text: string): void {
    if (this.params.logger.isInfoEnabled()) {
      this.params.logger.info(text);
    }
  }
  warn(text: string): void {
    if (this.params.logger.isWarnEnabled()) {
      this.params.logger.warn(text);
    }
  }
  error(text: string, error: Error): void {
    if (this.params.logger.isErrorEnabled()) {
      this.params.logger.error(`${text}\nError: ${error.message}\nStack: ${error.stack}`);
    }
  }
}
