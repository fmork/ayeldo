declare module '@fmork/backend-core' {
  export interface ILogWriter {
    debug(text: string): void;
    info(text: string): void;
    warn(text: string): void;
    error(text: string, error: Error): void;
  }
}

