import { NextFunction, Request, Response, Router } from 'express';
import { ILogWriter } from '../logging';
import {
  ExpressHttpRouter,
  ExpressRequestAdapter,
  ExpressResponseAdapter,
  HttpHandler,
  HttpResponse,
  HttpRouter,
} from './http';

export abstract class ControllerBase {
  // Internal Express router is fully encapsulated
  protected readonly expressRouter: Router = Router();
  private readonly httpRouter = new ExpressHttpRouter(this.expressRouter);

  public readonly baseUrl: string;
  private readonly baseLogWriter: ILogWriter;

  constructor(baseUrl: string, logWriter: ILogWriter) {
    this.baseUrl = baseUrl;
    this.baseLogWriter = logWriter;
  }

  public abstract initialize(): HttpRouter;

  protected getRouter(): HttpRouter {
    return this.httpRouter;
  }

  protected abstract addGet(path: string, handler: HttpHandler): void;
  protected abstract addPut(path: string, handler: HttpHandler): void;
  protected abstract addPost(path: string, handler: HttpHandler): void;
  protected abstract addDelete(path: string, handler: HttpHandler): void;

  protected async performRequest<T>(
    request: () => Promise<T> | T,
    res: HttpResponse,
    getStatusCode?: (result: T) => number
  ) {
    try {
      const result = await request();
      const statusCode = getStatusCode ? getStatusCode(result) : 200;
      res.status(statusCode).json(result);
    } catch (_error) {
      const error = _error as Error;
      this.baseLogWriter.error(`[${this.constructor.name}]: Error in ${this.performRequest.name}`, error);
      res.status(500).send();
    }
  }

  // Helper to wrap an HttpHandler into an Express handler
  protected wrap(handler: HttpHandler) {
    return async (req: Request, res: Response) => {
      const httpReq = new ExpressRequestAdapter(req);
      const httpRes = new ExpressResponseAdapter(res);
      await handler(httpReq, httpRes);
    };
  }

  // Helper to wrap an HttpMiddleware into an Express middleware
  protected wrapMiddleware(middleware: (req: any, res: any, next: () => void) => Promise<void> | void) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const httpReq = new ExpressRequestAdapter(req);
      const httpRes = new ExpressResponseAdapter(res);
      await middleware(httpReq, httpRes, next);
    };
  }
}
