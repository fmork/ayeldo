import type { ILogWriter } from '../logging';
import { ControllerBase } from './ControllerBase';
import type { HttpHandler, HttpMiddleware } from './http';

/**
 * Base class for controllers that require authorization middleware
 */
export abstract class AuthorizedController extends ControllerBase {
  // Authorization middleware function to be applied to all routes
  private readonly authorizer: HttpMiddleware;

  constructor(baseUrl: string, logWriter: ILogWriter, authorizer: HttpMiddleware) {
    super(baseUrl, logWriter);
    this.authorizer = authorizer;
  }

  // Override to add authorization middleware before GET handlers
  protected override addGet(path: string, handler: HttpHandler): void {
    this.expressRouter.get(path, this.wrapMiddleware(this.authorizer), this.wrap(handler));
  }

  // Override to add authorization middleware before PUT handlers
  protected override addPut(path: string, handler: HttpHandler): void {
    this.expressRouter.put(path, this.wrapMiddleware(this.authorizer), this.wrap(handler));
  }

  // Override to add authorization middleware before POST handlers
  protected override addPost(path: string, handler: HttpHandler): void {
    this.expressRouter.post(path, this.wrapMiddleware(this.authorizer), this.wrap(handler));
  }

  // Override to add authorization middleware before DELETE handlers
  protected override addDelete(path: string, handler: HttpHandler): void {
    this.expressRouter.delete(path, this.wrapMiddleware(this.authorizer), this.wrap(handler));
  }
}
