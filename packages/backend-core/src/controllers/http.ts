import { Request, Response, Router } from "express";

export interface HttpRequest {
  params: any;
  query: any;
  body: any;
  headers: any;
  cookies?: any;
  get(name: string): string | undefined;
}

export interface HttpResponse {
  status(code: number): HttpResponse;
  json(data: any): void;
  send(data?: any): void;
  setHeader(name: string, value: string): void;
  /** Sets a cookie on the response */
  cookie(
    name: string,
    value: string | Record<string, unknown>,
    options?: CookieOptions
  ): void;
  /** Clears a cookie on the response */
  clearCookie(name: string, options?: CookieOptions): void;
  on(event: string, listener: (...args: any[]) => void): void;
  write(chunk: any): void;
  end(chunk?: any): void;
  // Escape hatch for advanced scenarios (streaming, etc.)
  raw?(): any;
}

// Minimal cookie options compatible with Express
export type CookieOptions = {
  domain?: string;
  encode?: (val: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  secure?: boolean;
  signed?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
};

export type HttpHandler = (
  req: HttpRequest,
  res: HttpResponse
) => Promise<void> | void;
export type HttpMiddleware = (
  req: HttpRequest,
  res: HttpResponse,
  next: () => void
) => Promise<void> | void;

export interface HttpRouter {
  asExpressRouter(): Router;
}

export class ExpressRequestAdapter implements HttpRequest {
  constructor(private readonly req: Request) {}

  get params(): any {
    return this.req.params as any;
  }
  get query(): any {
    return this.req.query as any;
  }
  get body(): any {
    return this.req.body as any;
  }
  get headers(): any {
    return this.req.headers as any;
  }
  get cookies(): any | undefined {
    // Express cookie-parser optional
    return (this.req as any).cookies as any | undefined;
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
  json(data: any): void {
    this.res.json(data);
  }
  send(data?: any): void {
    this.res.send(data);
  }
  setHeader(name: string, value: string): void {
    this.res.setHeader(name, value);
  }
  cookie(
    name: string,
    value: string | Record<string, unknown>,
    options?: CookieOptions
  ): void {
    // @ts-ignore - Express handles object values by serializing to JSON
    this.res.cookie(name, value as any, options as any);
  }
  clearCookie(name: string, options?: CookieOptions): void {
    // @ts-ignore
    this.res.clearCookie(name, options as any);
  }
  on(event: string, listener: (...args: any[]) => void): void {
    // @ts-ignore
    this.res.on(event, listener);
  }
  write(chunk: any): void {
    // @ts-ignore
    this.res.write(chunk);
  }
  end(chunk?: any): void {
    // @ts-ignore
    this.res.end(chunk);
  }
  raw(): any {
    return this.res;
  }
}

export class ExpressHttpRouter implements HttpRouter {
  constructor(private readonly router: Router) {}
  asExpressRouter(): Router {
    return this.router;
  }
}
