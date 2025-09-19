import type { ILogWriter } from '../logging';

interface JsonUtilProps {
  logWriter: ILogWriter;
}

export class JsonUtil {
  constructor(private readonly props: JsonUtilProps) {}
  public getParsedRequestBody<T>(body: unknown): T {
    const methodSignatureString = (): string =>
      `${this.constructor.name}.getParsedBody(${JSON.stringify(body)})`;

    try {
      if (Buffer.isBuffer(body)) {
        // The request body is a Buffer
        return JSON.parse((body as Buffer).toString()) as T;
      }

      return body as T;
    } catch (_error) {
      const error = _error as Error;
      this.props.logWriter.error(`Error in ${methodSignatureString()}`, error);
      throw _error;
    }
  }
}
