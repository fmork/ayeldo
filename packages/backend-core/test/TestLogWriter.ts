import { ILogWriter } from '../src/logging/ILogWriter';

export class TestLogWriter implements ILogWriter {
  private readonly logs: Array<string>;

  constructor() {
    this.logs = new Array<string>();
  }
  debug(text: string): void {
    this.writeLog('DEBUG', text);
  }
  info(text: string): void {
    this.writeLog('INFO', text);
  }
  warn(text: string): void {
    this.writeLog('WARN', text);
  }
  error(text: string, error: Error): void {
    this.writeLog('ERROR', `${text}\nError: ${error.message}\nStack: ${error.stack}`);
  }
  private writeLog(level: string, text: string): void {
    const logText = `[${new Date().toISOString()}][${level}] ${text} `;
    this.logs.push(logText);
  }
  public flushLogs(writer: (...data: any[]) => void): void {
    for (const log of this.logs) {
      writer(log);
    }
    this.clearLogs();
  }
  public clearLogs(): void {
    this.logs.splice(0);
  }
}
