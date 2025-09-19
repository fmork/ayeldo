/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpResponse } from '@ayeldo/backend-core/dist/controllers/http';
import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAMES } from '../constants';

// Double-submit cookie CSRF guard.
// Expects a cookie named `csrf` (non-HttpOnly) and a header `X-CSRF-Token` with the same value.
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = (req.headers['x-csrf-token'] ??
      (req.headers as Record<string, unknown>)['X-CSRF-Token']) as string | undefined;
    const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.[
      COOKIE_NAMES.CSRF
    ] as string | undefined;
    if (!header || !cookie || header !== cookie) {
      res.status(403).json({ error: 'Forbidden - invalid CSRF token' });
      return;
    }
    next();
  } catch (e) {
    res.status(500).json({ error: 'CSRF guard failure' });
  }
}

export function requireCsrfWrapper(
  handler: (req: Request, res: Response, sid?: string) => Promise<void>,
): (req: Request, res: Response, sid?: string) => Promise<void> {
  return async (req: Request, res: Response, sid?: string): Promise<void> => {
    const header = (req.headers['x-csrf-token'] ??
      (req.headers as Record<string, unknown>)['X-CSRF-Token']) as string | undefined;
    const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.[
      COOKIE_NAMES.CSRF
    ] as string | undefined;
    if (!header || !cookie || header !== cookie) {
      res.status(403).json({ error: 'Forbidden - invalid CSRF token' });
      return;
    }
    await handler(req, res, sid);
  };
}

// Adapter for the project's Controller handlers which use unknown-typed req/res
export interface ControllerRequest {
  readonly headers?: Record<string, unknown>;
  readonly cookies?: Record<string, string>;
  readonly params?: Record<string, unknown>;
  readonly body?: unknown;
  readonly query?: Record<string, unknown>;
}

export function requireCsrfForController(
  handler: (req: ControllerRequest, res: HttpResponse, sid?: string) => Promise<void>,
): (req: any, res: HttpResponse) => Promise<void> {
  return async (req: any, res: HttpResponse): Promise<void> => {
    try {
      // The following code is intentionally commented out. I will be brought back at a later time.
      // // Convert HttpRequest to ControllerRequest (coerce cookie values to strings)
      // const headers = req.headers ?? {};
      // const rawCookies = (req.cookies ?? {}) as Record<string, unknown>;
      // const cookies: Record<string, string> = {};
      // for (const k of Object.keys(rawCookies)) {
      //   const v = rawCookies[k];
      //   if (typeof v === 'string') {
      //     cookies[k] = v;
      //   } else if (v != null) {
      //     cookies[k] = String(v);
      //   }
      // }

      // const controllerReq: ControllerRequest = {
      //   headers: headers as Record<string, unknown>,
      //   cookies,
      //   params: req.params ?? {},
      //   body: req.body,
      //   query: req.query ?? {},
      // };

      const sid = cookies[COOKIE_NAMES.SESSION_ID] as string | undefined;

      // TODO: re-enable CSRF checks here if desired
      await handler(controllerReq, res, sid);
    } catch (e) {
      res.status?.(500)?.json?.({ error: 'CSRF guard failure' });
    }
  };
}
