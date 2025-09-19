import type { ILogWriter } from '../logging';
import { ControllerBase } from './ControllerBase';
import type { HttpHandler } from './http';

export abstract class PublicController extends ControllerBase {
  constructor(baseUrl: string, logWriter: ILogWriter) {
    super(baseUrl, logWriter);
  }

  protected override addGet(path: string, handler: HttpHandler): void {
    this.expressRouter.get(path, this.wrap(handler));
  }
  protected override addPut(path: string, handler: HttpHandler): void {
    this.expressRouter.put(path, this.wrap(handler));
  }

  protected override addPost(path: string, handler: HttpHandler): void {
    this.expressRouter.post(path, this.wrap(handler));
  }

  protected override addDelete(path: string, handler: HttpHandler): void {
    this.expressRouter.delete(path, this.wrap(handler));
  }
}
