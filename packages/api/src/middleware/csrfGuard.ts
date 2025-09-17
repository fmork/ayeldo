/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpResponse } from '@fmork/backend-core';
import type { NextFunction, Request, Response } from 'express';
import { logWriter } from '../init/ApiInit';

// Double-submit cookie CSRF guard.
// Expects a cookie named `csrf` (non-HttpOnly) and a header `X-CSRF-Token` with the same value.
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = (req.headers['x-csrf-token'] ??
      (req.headers as Record<string, unknown>)['X-CSRF-Token']) as string | undefined;
    const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.['csrf'] as
      | string
      | undefined;
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
    const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.['csrf'] as
      | string
      | undefined;
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
): (req: ControllerRequest, res: HttpResponse, sid?: string) => Promise<void> {
  return async (req: ControllerRequest, res: HttpResponse, sid?: string): Promise<void> => {
    try {
      logWriter.info('Running CSRF guard for controller');
      const headers = req.headers ?? {};
      const header = (headers['x-csrf-token'] ?? headers['X-CSRF-Token']) as string | undefined;
      const cookie = req.cookies?.['csrf'] as string | undefined;

      logWriter.info(`CSRF token check: header=${header}, cookie=${cookie}`);
      if (!header || !cookie || header !== cookie) {
        logWriter.warn('CSRF token mismatch');
        res.status?.(403)?.json?.({ error: 'Forbidden - invalid CSRF token' });
        return;
      }
      await handler(req, res, sid);
    } catch (e) {
      res.status?.(500)?.json?.({ error: 'CSRF guard failure' });
    }
  };
}
