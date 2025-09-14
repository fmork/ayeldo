import { AuthorizationRequirement, ClaimAuthorizedController, ILogWriter, JsonUtil } from 'backend-core';
import { NextFunction, Request, Response, Router } from 'express';

// Minimal reference admin service to illustrate usage; replace with your real service
interface ExampleAdminService<T = any> {
  list(): Promise<T[]>;
  update(id: string, data: T): Promise<void>;
  remove(id: string): Promise<void>;
}

interface ReferenceClaimAuthorizedApiControllerProps<T = any> {
  baseUrl: string;
  // Authorizer can be a simple middleware or a factory that accepts a requirement
  authorizer:
    | ((req: Request, res: Response, next: NextFunction) => Promise<void>)
    | ((requirement?: AuthorizationRequirement) => (req: Request, res: Response, next: NextFunction) => Promise<void>);
  jsonUtil: JsonUtil;
  logWriter: ILogWriter;
  exampleAdminService?: ExampleAdminService<T>;
}

// Reference controller demonstrating claim/role-based authorization usage
export class ReferenceClaimAuthorizedApiController<T = any> extends ClaimAuthorizedController {
  constructor(private readonly props: ReferenceClaimAuthorizedApiControllerProps<T>) {
    super(props.baseUrl, props.logWriter, props.authorizer);
  }

  public initialize(): Router {
    this.props.logWriter.info('Initializing Reference Claim-Authorized API');

    // GET list with broader read requirement (e.g., readers or admins)
    this.addGet(
      '/admin/reference/items',
      async (_req, res) => {
        await this.performRequest(
          () => this.props.exampleAdminService?.list() ?? Promise.resolve([]),
          res
        );
      },
      { requiredValues: ['example-readers', 'example-admins'] }
    );

    // PUT update with stricter admin-only requirement
    this.addPut(
      '/admin/reference/items/:id',
      async (req, res) => {
        const { id } = req.params;
        const data = this.props.jsonUtil.getParsedRequestBody<T>(req.body);

        await this.performRequest(
          async () => {
            await this.props.exampleAdminService?.update(id, data);
            return { id };
          },
          res,
          // No body change needed; 204 is common for successful updates
          () => 204
        );
      },
      { requiredValues: ['example-admins'] }
    );

    // DELETE with admin-only requirement
    this.addDelete(
      '/admin/reference/items/:id',
      async (req, res) => {
        const { id } = req.params;

        await this.performRequest(
          async () => {
            await this.props.exampleAdminService?.remove(id);
            return { id };
          },
          res,
          () => 204
        );
      },
      { requiredValues: ['example-admins'] }
    );

    return this.router;
  }
}

