/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextFunction, Request, Response } from 'express';

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
export function requireCsrfForController(
  handler: (req: unknown, res: unknown, sid?: string) => Promise<void>,
): (req: unknown, res: unknown, sid?: string) => Promise<void> {
  return async (req: unknown, res: unknown, sid?: string): Promise<void> => {
    try {
      const headers = (req as { headers?: Record<string, unknown> }).headers ?? {};
      const header = (headers['x-csrf-token'] ?? headers['X-CSRF-Token']) as string | undefined;
      const cookie = (req as { cookies?: Record<string, string> }).cookies?.['csrf'] as
        | string
        | undefined;
      if (!header || !cookie || header !== cookie) {
        // res is unknown; coerce to minimal shape used elsewhere in project
        (res as { status: (code: number) => { json: (body: unknown) => void } })
          .status(403)
          .json({ error: 'Forbidden - invalid CSRF token' });
        return;
      }
      await handler(req, res, sid);
    } catch (e) {
      (res as { status: (code: number) => { json: (body: unknown) => void } })
        .status(500)
        .json({ error: 'CSRF guard failure' });
    }
  };
}
