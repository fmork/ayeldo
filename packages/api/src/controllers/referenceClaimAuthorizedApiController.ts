import type { NextFunction, Request, Response } from 'express';
import { ClaimAuthorizedController } from '@fmork/backend-core/dist/controllers';
import type { AuthorizationRequirement } from '@fmork/backend-core/dist/security';
import type { HttpMiddleware, HttpRouter } from '@fmork/backend-core/dist/controllers/http';
import { z } from 'zod';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';
import { JsonUtil } from '@fmork/backend-core/dist/Json';

// Minimal reference admin service to illustrate usage; replace with your real service
export interface ExampleAdminService<T = unknown> {
  list(): Promise<T[]>;
  update(id: string, data: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ReferenceClaimAuthorizedApiControllerProps<T = unknown> {
  baseUrl: string;
  // Authorizer can be a simple middleware or a factory that accepts a requirement
  authorizer:
    | HttpMiddleware
    | ((requirement?: AuthorizationRequirement) => HttpMiddleware);
  jsonUtil: JsonUtil;
  logWriter: ILogWriter;
  exampleAdminService?: ExampleAdminService<T>;
  // Optional zod schema for PUT update body
  updateSchema?: z.ZodType<T>;
}

// Reference controller demonstrating claim/role-based authorization usage
export class ReferenceClaimAuthorizedApiController<T = unknown> extends ClaimAuthorizedController {
  private readonly props: ReferenceClaimAuthorizedApiControllerProps<T>;

  constructor(props: ReferenceClaimAuthorizedApiControllerProps<T>) {
    super(props.baseUrl, props.logWriter, props.authorizer);
    this.props = props;
  }

  public initialize(): HttpRouter {
    this.props.logWriter.info('Initializing Reference Claim-Authorized API');

    // GET list with broader read requirement (e.g., readers or admins)
    this.addGet(
      '/admin/reference/items',
      async (_req, res) => {
        await this.performRequest(
          () => this.props.exampleAdminService?.list() ?? Promise.resolve([] as T[]),
          res
        );
      },
      { requiredValues: ['example-readers', 'example-admins'] }
    );

    // PUT update with stricter admin-only requirement
    this.addPut(
      '/admin/reference/items/:id',
      async (req, res) => {
        const id = z.string().min(1).parse((req as unknown as { params: { id: unknown } }).params.id);
        const raw = (req as unknown as { body: unknown }).body;
        const data: T = this.props.updateSchema
          ? this.props.updateSchema.parse(raw)
          : this.props.jsonUtil.getParsedRequestBody<T>(raw);

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
        const id = z.string().min(1).parse((req as unknown as { params: { id: unknown } }).params.id);

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

    return this.getRouter();
  }
}
