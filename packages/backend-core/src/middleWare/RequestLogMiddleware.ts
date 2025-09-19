import { NextFunction, Request, Response } from 'express';
import { ILogWriter } from '../logging/ILogWriter';

interface RequestLogMiddlewareProps {
  logWriter: ILogWriter;
}

export class RequestLogMiddleware {
  constructor(private readonly props: RequestLogMiddlewareProps) {}

  public logRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const httpMethod = req.method.toUpperCase();
    const startTime = new Date();
    // log start of request
    this.props.logWriter.info(
      `${httpMethod} ${req.originalUrl}${
        httpMethod === 'PUT' || httpMethod === 'POST' || httpMethod === 'DELETE' ? ` (body: ${req.body})` : ''
      }`
    );

    res.on('finish', () => {
      // log finish of request with status code and amount of data sent
      this.props.logWriter.info(
        `${res.statusCode} ${res.statusMessage}; ${res.get('Content-Length') || 0}b sent, ${new Date().getTime() - startTime.getTime()}ms`
      );
    });

    next();
  };
}
