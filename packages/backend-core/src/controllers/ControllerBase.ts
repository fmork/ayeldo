import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import type { ILogWriter } from '../logging';
import type { HttpHandler, HttpMiddleware, HttpResponse, HttpRouter } from './http';
import { ExpressHttpRouter, ExpressRequestAdapter, ExpressResponseAdapter } from './http';

export abstract class ControllerBase {
  // Local alias to avoid using `any` directly in casts inside wrappers
  // Keeps lint happy while allowing Express adapter shapes to be passed to Http handlers in tests
  // (removed invalid in-class type alias)
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
    getStatusCode?: (result: T) => number,
  ): Promise<void> {
    try {
      const result = await request();
      const statusCode = getStatusCode ? getStatusCode(result) : 200;
      res.status(statusCode).json(result);
    } catch (_error) {
      const error = _error as Error;
      this.baseLogWriter.error(
        `[${this.constructor.name}]: Error in ${this.performRequest.name}`,
        error,
      );
      res.status(500).send();
    }
  }

  // Helper to wrap an HttpHandler into an Express handler
  protected wrap(handler: HttpHandler): (req: Request, res: Response) => Promise<void> {
    return async (req: Request, res: Response): Promise<void> => {
      const httpReq = new ExpressRequestAdapter(req);
      const httpRes = new ExpressResponseAdapter(res);
      await handler(httpReq, httpRes);
    };
  }

  // Helper to wrap an HttpMiddleware into an Express middleware
  protected wrapMiddleware(
    middleware: HttpMiddleware,
  ): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const httpReq = new ExpressRequestAdapter(req);
      const httpRes = new ExpressResponseAdapter(res);
      await middleware(httpReq, httpRes, next);
    };
  }
}
