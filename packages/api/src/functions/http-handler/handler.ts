import { runWithRequestContext } from '@ayeldo/utils';
import type { HttpRequest, HttpResponse } from '@fmork/backend-core';
import AWSXRay from 'aws-xray-sdk-core';
import type { NextFunction, Request, Response } from 'express';
import ServerlessHttp from 'serverless-http';
import { logWriter, server } from '../../init/ApiInit';
import { csrfGuard } from '../../middleware/csrfGuard';

// Enable X-Ray tracing
AWSXRay.config([AWSXRay.plugins.ECSPlugin, AWSXRay.plugins.EC2Plugin]);

logWriter.info('Loading API handler');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
server.useMiddleware((req: HttpRequest, _res: HttpResponse, next: () => void) => {
  try {
    const headers = req.headers ?? {};
    const cookies = req.cookies ?? {};

    logWriter.info(`HTTP Request headers: ${JSON.stringify(headers)}`);
    logWriter.info(`HTTP Request cookies: ${JSON.stringify(cookies)}`);
  } catch (error) {
    logWriter.error(`Error logging HTTP request: ${error}`, error as Error);
  }

  next();
});

server.useMiddleware((req: unknown, res: unknown, next: unknown) => {
  // Express types are not imported here; keep it minimal and type-safe
  const r = req as { headers?: Record<string, string | string[] | undefined> };
  const w = res as { setHeader?: (name: string, value: string) => void };
  const n = next as () => void;
  const fromHeader = r.headers?.['x-request-id'];
  const id = Array.isArray(fromHeader)
    ? fromHeader[0]
    : (fromHeader as string | undefined) || (Math.random() + 1).toString(36).slice(2);
  if (w.setHeader) w.setHeader('X-Request-Id', id);
  runWithRequestContext(id, () => n());
});

// Global CSRF middleware: only apply to state-changing methods from browser clients.
// Exclude webhook endpoints (they are external providers and cannot supply CSRF tokens).
server.useMiddleware((req: unknown, res: unknown, next: unknown) => {
  try {
    const r = req as { method?: string; url?: string };
    const method = (r.method ?? 'GET').toUpperCase();
    const url = r.url ?? '';

    // Only enforce CSRF for unsafe HTTP methods
    if (!['POST', 'PUT', 'DELETE'].includes(method)) {
      return (next as () => void)();
    }

    // Exclude external webhook routes
    if (url.startsWith('/webhooks')) {
      return (next as () => void)();
    }

    // Delegate to the express-typed csrfGuard
    csrfGuard(req as Request, res as Response, next as NextFunction);
  } catch (e) {
    // In case of unexpected failures, return 500
    try {
      (res as { status?: (c: number) => { json: (b: unknown) => void } }).status?.(500).json({
        error: 'CSRF middleware failure',
      });
    } catch (_e) {
      // swallow
    }
  }
});

// Now obtain (and initialize) the app for ServerlessHttp
const app = server.getExpressApp();

export const main = ServerlessHttp(app);
