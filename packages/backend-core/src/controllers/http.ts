import type { Request, Response, Router } from 'express';

export interface HttpRequest {
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
  headers: Record<string, string | undefined>;
  cookies?: Record<string, unknown>;
  get(name: string): string | undefined;
}

export interface HttpResponse {
  status(code: number): HttpResponse;
  json(data: unknown): void;
  send(data?: unknown): void;
  setHeader(name: string, value: string): void;
  /** Sets a cookie on the response */
  cookie(name: string, value: string | Record<string, unknown>, options?: CookieOptions): void;
  /** Clears a cookie on the response */
  clearCookie(name: string, options?: CookieOptions): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  write(chunk: unknown): void;
  end(chunk?: unknown): void;
  // Escape hatch for advanced scenarios (streaming, etc.)
  raw?(): unknown;
}

// Minimal cookie options compatible with Express
export interface CookieOptions {
  domain?: string;
  encode?: (val: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  secure?: boolean;
  signed?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
}

export type HttpHandler = (req: HttpRequest, res: HttpResponse) => Promise<void> | void;
export type HttpMiddleware = (
  req: HttpRequest,
  res: HttpResponse,
  next: () => void,
) => Promise<void> | void;

export interface HttpRouter {
  asExpressRouter(): Router;
}

export class ExpressRequestAdapter implements HttpRequest {
  constructor(private readonly req: Request) {}

  get params(): Record<string, unknown> {
    return this.req.params as Record<string, unknown>;
  }
  get query(): Record<string, unknown> {
    return this.req.query as Record<string, unknown>;
  }
  get body(): unknown {
    return this.req.body as unknown;
  }
  get headers(): Record<string, string | undefined> {
    return this.req.headers as Record<string, string | undefined>;
  }
  get cookies(): Record<string, unknown> | undefined {
    // Express cookie-parser optional
    return (this.req as unknown as { cookies?: Record<string, unknown> }).cookies;
  }

  get(name: string): string | undefined {
    return this.req.get(name) ?? undefined;
  }
}

export class ExpressResponseAdapter implements HttpResponse {
  constructor(private readonly res: Response) {}

  status(code: number): HttpResponse {
    this.res.status(code);
    return this;
  }
  json(data: unknown): void {
    this.res.json(data as unknown as Record<string, unknown>);
  }
  send(data?: unknown): void {
    this.res.send(data as unknown as string | Record<string, unknown> | undefined);
  }
  setHeader(name: string, value: string): void {
    this.res.setHeader(name, value);
  }
  cookie(name: string, value: string | Record<string, unknown>, options?: CookieOptions): void {
    // Express accepts object values; use any cast to interop with Express types
    (
      this.res as unknown as {
        cookie: (n: string, v: string | Record<string, unknown>, o?: CookieOptions) => void;
      }
    ).cookie(name, value as string | Record<string, unknown>, options);
  }
  clearCookie(name: string, options?: CookieOptions): void {
    (this.res as unknown as { clearCookie: (n: string, o?: CookieOptions) => void }).clearCookie(
      name,
      options,
    );
  }
  on(event: string, listener: (...args: unknown[]) => void): void {
    (this.res as unknown as { on: (e: string, l: (...args: unknown[]) => void) => void }).on(
      event,
      listener,
    );
  }
  write(chunk: unknown): void {
    (this.res as unknown as { write: (c: unknown) => void }).write(chunk);
  }
  end(chunk?: unknown): void {
    (this.res as unknown as { end: (c?: unknown) => void }).end(chunk);
  }
  raw(): unknown {
    return this.res;
  }
}

export class ExpressHttpRouter implements HttpRouter {
  constructor(private readonly router: Router) {}
  asExpressRouter(): Router {
    return this.router;
  }
}
