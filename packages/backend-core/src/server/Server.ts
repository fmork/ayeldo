import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import type { CorsOptions, CorsOptionsDelegate } from 'cors';
import cors from 'cors';
import type { Express } from 'express';
import express from 'express';
import type * as http from 'http';
import type { ControllerBase } from '../controllers/ControllerBase';
import type { HttpRequest, HttpResponse, HttpRouter } from '../controllers/http';
import { ExpressRequestAdapter, ExpressResponseAdapter } from '../controllers/http';
import type { ILogWriter } from '../logging/ILogWriter';
import type { RequestLogMiddleware } from '../middleWare/RequestLogMiddleware';

interface ServerLoggingProps {
  logWriter: ILogWriter;
  logRoutesOnInitialize?: boolean;
  logCorsRejections?: boolean;
}

interface ServerProps {
  port: number;
  corsOptions: CorsOptions | CorsOptionsDelegate;
  controllers: ControllerBase[];
  requestLogger: RequestLogMiddleware;
  logging: ServerLoggingProps;
}

export class Server {
  private readonly expressApp = express();
  private expressServer: http.Server | undefined = undefined;
  private isInitialized = false;

  constructor(private readonly props: ServerProps) {}

  /**
   * Register a middleware function to be used by the server.
   * The middleware signature should match (req, res, next) => void or Promise<void>.
   * This avoids leaking the Express dependency.
   */
  public useMiddleware(
    middleware: (req: HttpRequest, res: HttpResponse, next: () => void) => void | Promise<void>,
  ): void {
    const wrapped = (
      req: express.Request,
      res: express.Response,
      next: (err?: unknown) => void,
    ): void => {
      const adaptedReq = new ExpressRequestAdapter(req);
      const adaptedRes = new ExpressResponseAdapter(res);
      try {
        const maybePromise = middleware(adaptedReq, adaptedRes, () => next());
        if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
          (maybePromise as Promise<void>).catch((err: unknown) => next(err));
        }
      } catch (err: unknown) {
        next(err);
      }
    };

    this.expressApp.use(wrapped);
  }

  public getExpressApp = (): Express => {
    if (!this.isInitialized) {
      this.initialize();
    }

    return this.expressApp;
  };

  public close(): void {
    if (this.expressServer) {
      this.expressServer.close();
    }
  }

  private createCorsMiddleware = ():
    | ((req: express.Request, res: express.Response, next: express.NextFunction) => void)
    | ReturnType<typeof cors> => {
    const { corsOptions, logging } = this.props;
    const shouldLogRejections = !!logging.logCorsRejections;
    const corsMiddleware = cors(corsOptions);

    logging.logWriter.info(
      `CORS middleware initialized with options: ${JSON.stringify(corsOptions)}`,
    );

    if (!shouldLogRejections) {
      return corsMiddleware;
    }

    logging.logWriter.info('CORS rejection logging is enabled');

    // Wrap the CORS middleware to log rejections
    return (req: express.Request, res: express.Response, next: (err?: unknown) => void): void => {
      corsMiddleware(req, res, (err?: unknown) => {
        if (err) {
          const message = (err as { message?: string } | null)?.message ?? String(err);
          logging.logWriter.warn(
            `CORS request rejected for origin: ${req.headers.origin || 'unknown'} - ${message}`,
          );
        }
        next(err);
      });
    };
  };

  private initialize = (): void => {
    // Handle CORS with logging for rejections

    this.props.logging.logWriter.info(
      `Initializing server. Logging props: ${JSON.stringify(this.props.logging)}`,
    );

    // Middleware
    this.expressApp.use(this.createCorsMiddleware());
    // Parse cookies so ExpressRequestAdapter.get cookies returns value when available
    this.expressApp.use(cookieParser());
    this.expressApp.use(bodyParser.json());
    this.expressApp.use(this.props.requestLogger.logRequest);

    for (const controller of this.props.controllers) {
      this.initializeController(controller);
    }

    // Start server
    this.expressServer = this.expressApp.listen(this.props.port, () => {
      this.props.logging.logWriter.info(`Server running on http://localhost:${this.props.port}`);
    });

    this.isInitialized = true;
  };

  private extractRoutes = (stack: unknown[], basePath = ''): string[] => {
    if (!stack || !Array.isArray(stack)) {
      return [];
    }

    interface ExpressLayer {
      route?: { methods: Record<string, boolean>; path: string };
      name?: string;
      handle?: { stack?: unknown[] };
      regexp?: RegExp;
    }

    const routes: string[] = [];

    stack.forEach((layerRaw) => {
      try {
        const layer = layerRaw as ExpressLayer;
        if (layer.route) {
          // Direct route
          const methods = Object.keys(layer.route.methods)
            .map((m) => m.toUpperCase())
            .join(', ');
          routes.push(`  ${methods} ${basePath}${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // Router middleware
          let routerBasePath = '';
          if (layer.regexp && layer.regexp.source) {
            routerBasePath = layer.regexp.source
              .replace(/^\^/, '')
              .replace(/\\\//g, '/')
              .replace(/\$.*/, '')
              .replace(/\?\?\*$/, '')
              .replace(/\(\?=/g, '')
              .replace(/\\\)/g, '')
              .replace(/\|.*$/, '');
          }

          routes.push(...this.extractRoutes(layer.handle.stack ?? [], basePath + routerBasePath));
        }
      } catch (layerError) {
        const _error = layerError as Error;
        this.props.logging.logWriter.error(`  Error processing layer: ${_error.message}`, _error);
      }
    });

    return routes;
  };

  private initializeController(controller: ControllerBase): void {
    this.props.logging.logWriter.info(
      `Initializing controller ${controller.constructor.name} (base URL '${controller.baseUrl}')`,
    );
    const httpRouter: HttpRouter = controller.initialize();
    const router = httpRouter.asExpressRouter();

    if (this.props.logging.logRoutesOnInitialize) {
      this.logRegisteredRoutes(router, controller);
    }

    // Add routes
    this.expressApp.use(controller.baseUrl, router);
  }

  private logRegisteredRoutes(router: express.Router, controller: ControllerBase): void {
    const routes = this.extractRoutes(router.stack);
    const routesLogMessages: string[] = [];

    routesLogMessages.push(
      `Registered routes for ${controller.constructor.name} (start)----------`,
    );
    routesLogMessages.push(...routes.map((route) => `  ${route}`));

    routesLogMessages.push(
      `Registered routes for ${controller.constructor.name} (end)------------`,
    );
    this.props.logging.logWriter.info(routesLogMessages.join('\n'));
  }
}
