declare module '@fmork/backend-core' {
  export interface ILogWriter {
    debug(text: string): void;
    info(text: string): void;
    warn(text: string): void;
    error(text: string, error: Error): void;
  }
}

declare module '@fmork/backend-core/src/security/ClaimBasedAuthorizer' {
  interface AuthorizationRequirement {
    requiredValues?: string[];
    /** @deprecated Use requiredValues instead */
    requiredGroups?: string[];
  }

  interface AuthorizationResult {
    success: boolean;
    user?: any;
    error?: {
      status: number;
      message: string;
    };
  }

  export class ClaimBasedAuthorizer {
    constructor(props: { jwtAuthorization: unknown; logWriter: unknown; claimNames: string[] });

    createAuthorizer(
      requirement?: AuthorizationRequirement,
    ): (req: unknown, res: unknown, next: unknown) => Promise<void>;

    authorizeToken(
      token: string,
      requirement?: AuthorizationRequirement,
    ): Promise<AuthorizationResult>;
  }
}

declare module '@fmork/backend-core/src/security/GroupBasedAuthorizer' {
  interface AuthorizationRequirement {
    requiredValues?: string[];
    /** @deprecated Use requiredValues instead */
    requiredGroups?: string[];
  }

  export class GroupBasedAuthorizer {
    constructor(props: {
      jwtAuthorization: unknown;
      logWriter: unknown;
      groupClaimNames: string[];
    });

    createAuthorizer(
      requirement?: AuthorizationRequirement,
    ): (req: unknown, res: unknown, next: unknown) => Promise<void>;
  }
}

declare module '@fmork/backend-core/src/security/AuthorizationTypes' {
  export interface AuthorizationRequirement {
    /** Values that must be present in the JWT token's configured claims */
    requiredValues?: string[];
    /** @deprecated Use requiredValues instead. Kept for backward compatibility. */
    requiredGroups?: string[];
  }

  export type RouteAuthorizationConfig = Record<string, AuthorizationRequirement>;
}

declare module '@fmork/backend-core/src/controllers' {
  export interface HttpResponse {
    status(code: number): HttpResponse;
    json(data: any): void;
    send(data?: any): void;
    setHeader(name: string, value: string): void;
    /** Sets a cookie on the response */
    cookie(name: string, value: string | Record<string, unknown>, options?: CookieOptions): void;
    /** Clears a cookie on the response */
    clearCookie(name: string, options?: CookieOptions): void;
    on(event: string, listener: (...args: any[]) => void): void;
    write(chunk: any): void;
    end(chunk?: any): void;
    // Escape hatch for advanced scenarios (streaming, etc.)
    raw?(): any;
  }

  export type CookieOptions = {
    domain?: string;
    encode?: (val: string) => string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    secure?: boolean;
    signed?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
  };

  interface AuthorizationRequirement {
    requiredValues?: string[];
    /** @deprecated Use requiredValues instead */
    requiredGroups?: string[];
  }
  export interface HttpRouter {
    asExpressRouter(): Router;
  }
  export abstract class ControllerBase {
    protected readonly router: unknown;
    readonly baseUrl: string;
    private readonly baseLogWriter: unknown;

    constructor(baseUrl: string, logWriter: unknown);

    abstract initialize(): HttpRouter;

    protected getRouter(): HttpRouter;

    protected abstract addGet(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected abstract addPut(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected abstract addPost(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected abstract addDelete(path: string, handler: (req: unknown, res: unknown) => void): void;

    protected performRequest<T>(
      request: () => Promise<T> | T,
      res: HttpResponse,
      getStatusCode?: (result: T) => number,
    ): Promise<void>;
  }

  export abstract class PublicController extends ControllerBase {
    constructor(baseUrl: string, logWriter: unknown);

    protected addGet(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected addPut(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected addPost(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected addDelete(path: string, handler: (req: unknown, res: unknown) => void): void;
  }

  export abstract class AuthorizedController extends ControllerBase {
    constructor(
      baseUrl: string,
      logWriter: unknown,
      authorizer: (req: unknown, res: unknown, next: unknown) => Promise<void>,
    );

    protected addGet(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected addPut(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected addPost(path: string, handler: (req: unknown, res: unknown) => void): void;
    protected addDelete(path: string, handler: (req: unknown, res: unknown) => void): void;
  }

  export abstract class ClaimAuthorizedController extends ControllerBase {
    constructor(
      baseUrl: string,
      logWriter: unknown,
      authorizerOrFactory:
        | ((req: unknown, res: unknown, next: unknown) => Promise<void>)
        | ((
            requirement?: AuthorizationRequirement,
          ) => (req: unknown, res: unknown, next: unknown) => Promise<void>),
    );

    protected addGet(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
    protected addPost(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
    protected addPut(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
    protected addDelete(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
  }

  export abstract class GroupAuthorizedController extends ControllerBase {
    constructor(
      baseUrl: string,
      logWriter: unknown,
      authorizerOrFactory:
        | ((req: unknown, res: unknown, next: unknown) => Promise<void>)
        | ((
            requirement?: AuthorizationRequirement,
          ) => (req: unknown, res: unknown, next: unknown) => Promise<void>),
    );

    protected addGet(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
    protected addPost(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
    protected addPut(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
    protected addDelete(
      path: string,
      handler: (req: unknown, res: unknown) => void,
      authRequirement?: AuthorizationRequirement,
    ): void;
  }
}
