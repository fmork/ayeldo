import type { ILogWriter } from '../logging';
import type { AuthorizationRequirement } from '../security/AuthorizationTypes';
import { ControllerBase } from './ControllerBase';
import type { HttpHandler, HttpMiddleware } from './http';

/**
 * Base class for controllers that require authorization with optional group-based permissions
 * Supports both legacy single authorizer and new per-endpoint authorization requirements
 */
export abstract class GroupAuthorizedController extends ControllerBase {
  // Legacy authorization middleware function (for backward compatibility)
  private readonly legacyAuthorizer?: HttpMiddleware;

  // Function to create authorizers with specific requirements
  private readonly createAuthorizer?: (requirement?: AuthorizationRequirement) => HttpMiddleware;

  constructor(
    baseUrl: string,
    logWriter: ILogWriter,
    authorizerOrFactory:
      | HttpMiddleware
      | ((requirement?: AuthorizationRequirement) => HttpMiddleware),
  ) {
    super(baseUrl, logWriter);

    // Validate that an authorizer is provided
    if (!authorizerOrFactory) {
      throw new Error('Authorizer is required');
    }

    // Determine if this is a legacy authorizer or an authorizer factory
    // We can detect this by checking the function length (number of parameters)
    if (authorizerOrFactory.length === 3) {
      // Legacy authorizer (req, res, next)
      this.legacyAuthorizer = authorizerOrFactory as HttpMiddleware;
    } else {
      // Authorizer factory (requirement?) => middleware
      this.createAuthorizer = authorizerOrFactory as (
        requirement?: AuthorizationRequirement,
      ) => HttpMiddleware;
    }
  }

  /**
   * Add a GET route with optional authorization requirements
   */
  protected addGet(
    path: string,
    handler: HttpHandler,
    authRequirement?: AuthorizationRequirement,
  ): void {
    const authorizer = this.getAuthorizer(authRequirement);
    this.expressRouter.get(path, this.wrapMiddleware(authorizer), this.wrap(handler));
  }

  /**
   * Add a POST route with optional authorization requirements
   */
  protected addPost(
    path: string,
    handler: HttpHandler,
    authRequirement?: AuthorizationRequirement,
  ): void {
    const authorizer = this.getAuthorizer(authRequirement);
    this.expressRouter.post(path, this.wrapMiddleware(authorizer), this.wrap(handler));
  }

  /**
   * Add a PUT route with optional authorization requirements
   */
  protected addPut(
    path: string,
    handler: HttpHandler,
    authRequirement?: AuthorizationRequirement,
  ): void {
    const authorizer = this.getAuthorizer(authRequirement);
    this.expressRouter.put(path, this.wrapMiddleware(authorizer), this.wrap(handler));
  }

  /**
   * Add a DELETE route with optional authorization requirements
   */
  protected addDelete(
    path: string,
    handler: HttpHandler,
    authRequirement?: AuthorizationRequirement,
  ): void {
    const authorizer = this.getAuthorizer(authRequirement);
    this.expressRouter.delete(path, this.wrapMiddleware(authorizer), this.wrap(handler));
  }

  /**
   * Get the appropriate authorizer based on whether we have legacy or factory mode
   */
  private getAuthorizer(authRequirement?: AuthorizationRequirement): HttpMiddleware {
    if (this.legacyAuthorizer) {
      // Legacy mode: ignore authRequirement and use the single authorizer
      return this.legacyAuthorizer;
    } else if (this.createAuthorizer) {
      // Factory mode: create authorizer with requirements
      return this.createAuthorizer(authRequirement);
    } else {
      throw new Error('No authorizer configured');
    }
  }
}
