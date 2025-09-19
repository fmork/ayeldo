import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors, { CorsOptions, CorsOptionsDelegate } from "cors";
import express, { Express } from "express";
import * as http from "http";
import { ControllerBase } from "../controllers/ControllerBase";
import {
  ExpressRequestAdapter,
  ExpressResponseAdapter,
  HttpRequest,
  HttpResponse,
  HttpRouter,
} from "../controllers/http";
import { ILogWriter } from "../logging/ILogWriter";
import { RequestLogMiddleware } from "../middleWare/RequestLogMiddleware";

interface ServerLoggingProps {
  logWriter: ILogWriter;
  logRoutesOnInitialize?: boolean;
  logCorsRejections?: boolean;
}

interface ServerProps {
  port: number;
  corsOptions: CorsOptions | CorsOptionsDelegate;
  controllers: Array<ControllerBase>;
  requestLogger: RequestLogMiddleware;
  logging: ServerLoggingProps;
}

export class Server {
  private readonly expressApp = express();
  private expressServer: http.Server | undefined = undefined;
  private isInitialized: boolean = false;

  constructor(private readonly props: ServerProps) {}

  /**
   * Register a middleware function to be used by the server.
   * The middleware signature should match (req, res, next) => void or Promise<void>.
   * This avoids leaking the Express dependency.
   */
  public useMiddleware(
    middleware: (
      req: HttpRequest,
      res: HttpResponse,
      next: () => void
    ) => void | Promise<void>
  ): void {
    const wrapped = (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const adaptedReq = new ExpressRequestAdapter(req);
      const adaptedRes = new ExpressResponseAdapter(res);
      try {
        const maybePromise = middleware(adaptedReq, adaptedRes, () => next());
        if (
          maybePromise &&
          typeof (maybePromise as Promise<void>).then === "function"
        ) {
          (maybePromise as Promise<void>).catch((err) => next(err));
        }
      } catch (err) {
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

  private createCorsMiddleware = () => {
    const { corsOptions, logging } = this.props;
    const shouldLogRejections = !!logging.logCorsRejections;
    const corsMiddleware = cors(corsOptions);

    logging.logWriter.info(
      `CORS middleware initialized with options: ${JSON.stringify(corsOptions)}`
    );

    if (!shouldLogRejections) {
      return corsMiddleware;
    }

    logging.logWriter.info("CORS rejection logging is enabled");

    // Wrap the CORS middleware to log rejections
    return (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      corsMiddleware(req, res, (err?: any) => {
        if (err) {
          logging.logWriter.warn(
            `CORS request rejected for origin: ${
              req.headers.origin || "unknown"
            } - ${err.message}`
          );
        }
        next(err);
      });
    };
  };

  private initialize = () => {
    // Handle CORS with logging for rejections

    this.props.logging.logWriter.info(
      `Initializing server. Logging props: ${JSON.stringify(
        this.props.logging
      )}`
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
      this.props.logging.logWriter.info(
        `Server running on http://localhost:${this.props.port}`
      );
    });

    this.isInitialized = true;
  };

  private extractRoutes = (stack: any[], basePath = ""): string[] => {
    if (!stack || !Array.isArray(stack)) {
      return [];
    }
    // Get all routes from the Express app
    const routes: string[] = [];

    stack.forEach((layer) => {
      try {
        if (layer.route) {
          // Direct route
          const methods = Object.keys(layer.route.methods)
            .map((m) => m.toUpperCase())
            .join(", ");
          routes.push(`  ${methods} ${basePath}${layer.route.path}`);
        } else if (
          layer.name === "router" &&
          layer.handle &&
          layer.handle.stack
        ) {
          // Router middleware
          let routerBasePath = "";
          if (layer.regexp && layer.regexp.source) {
            routerBasePath = layer.regexp.source
              .replace(/^\^/, "")
              .replace(/\\\//g, "/")
              .replace(/\$.*/, "")
              .replace(/\?\?\*$/, "")
              .replace(/\(\?\=/g, "")
              .replace(/\\\)/g, "")
              .replace(/\|.*$/, "");
          }

          this.extractRoutes(layer.handle.stack, basePath + routerBasePath);
        }
      } catch (layerError) {
        const _error = layerError as Error;
        this.props.logging.logWriter.error(
          `  Error processing layer: ${_error.message}`,
          _error
        );
      }
    });
    return routes;
  };

  private initializeController(controller: ControllerBase) {
    this.props.logging.logWriter.info(
      `Initializing controller ${controller.constructor.name} (base URL '${controller.baseUrl}')`
    );
    const httpRouter: HttpRouter = controller.initialize();
    const router = httpRouter.asExpressRouter();

    if (this.props.logging.logRoutesOnInitialize) {
      this.logRegisteredRoutes(router, controller);
    }

    // Add routes
    this.expressApp.use(controller.baseUrl, router);
  }

  private logRegisteredRoutes(
    router: express.Router,
    controller: ControllerBase
  ) {
    const routes = this.extractRoutes(router.stack);
    const routesLogMessages: string[] = [];

    routesLogMessages.push(
      `Registered routes for ${controller.constructor.name} (start)----------`
    );
    routesLogMessages.push(...routes.map((route) => `  ${route}`));

    routesLogMessages.push(
      `Registered routes for ${controller.constructor.name} (end)------------`
    );
    this.props.logging.logWriter.info(routesLogMessages.join("\n"));
  }
}
