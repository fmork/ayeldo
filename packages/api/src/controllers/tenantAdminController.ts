import type {
  AuthorizationRequirement,
  HttpMiddleware,
  HttpRouter,
  ILogWriter,
  JsonUtil,
} from '@fmork/backend-core';
import { ClaimAuthorizedController } from '@fmork/backend-core';
import type { SessionService } from '../services/sessionService';

export interface TenantAdminControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly jsonUtil: JsonUtil;
  readonly sessionService: SessionService;
  readonly authorizer:
    | HttpMiddleware
    | ((requirement?: AuthorizationRequirement) => HttpMiddleware);
}

/**
 * Admin controller for tenant management operations.
 * Requires authentication via session and JWT validation with admin claims.
 */
export class TenantAdminController extends ClaimAuthorizedController {
  private readonly sessionService: SessionService;
  private readonly jsonUtil: JsonUtil;

  public constructor(props: TenantAdminControllerProps) {
    super(props.baseUrl, props.logWriter, props.authorizer);
    this.sessionService = props.sessionService;
    this.jsonUtil = props.jsonUtil;
  }

  public initialize(): HttpRouter {
    // GET /admin/tenants - List all tenants (requires tenant-admin role)
    this.addGet(
      '/admin/tenants',
      async (_req, res) => {
        await this.performRequest(async () => {
          // TODO: Implement actual tenant listing logic
          return {
            tenants: [
              { id: 'tenant-1', name: 'Demo Tenant 1', status: 'active' },
              { id: 'tenant-2', name: 'Demo Tenant 2', status: 'inactive' },
            ],
          };
        }, res);
      },
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    // POST /admin/tenants - Create a new tenant (requires super-admin role)
    this.addPost(
      '/admin/tenants',
      async (req, res) => {
        const tenantData = this.jsonUtil.getParsedRequestBody<Record<string, unknown>>(req.body);

        await this.performRequest(
          async () => {
            // TODO: Implement actual tenant creation logic
            const newTenant = {
              id: `tenant-${Date.now()}`,
              ...tenantData,
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            return newTenant;
          },
          res,
          () => 201,
        );
      },
      { requiredValues: ['super-admin'] },
    );

    // PUT /admin/tenants/:tenantId - Update tenant (requires tenant-admin role)
    this.addPut(
      '/admin/tenants/:tenantId',
      async (req, res) => {
        const { tenantId } = (req as { params: { tenantId: string } }).params;
        const updateData = this.jsonUtil.getParsedRequestBody<Record<string, unknown>>(req.body);

        await this.performRequest(async () => {
          // TODO: Implement actual tenant update logic
          const updatedTenant = {
            id: tenantId,
            ...updateData,
            updatedAt: new Date().toISOString(),
          };
          return updatedTenant;
        }, res);
      },
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    // DELETE /admin/tenants/:tenantId - Delete tenant (requires super-admin role)
    this.addDelete(
      '/admin/tenants/:tenantId',
      async (req, res) => {
        const { tenantId } = (req as { params: { tenantId: string } }).params;

        await this.performRequest(
          async () => {
            // TODO: Implement actual tenant deletion logic
            return { id: tenantId, deleted: true };
          },
          res,
          () => 204,
        );
      },
      { requiredValues: ['super-admin'] },
    );

    // GET /admin/tenants/:tenantId/users - List users in a tenant (requires tenant-admin role)
    this.addGet(
      '/admin/tenants/:tenantId/users',
      async (req, res) => {
        const { tenantId } = (req as { params: { tenantId: string } }).params;

        await this.performRequest(async () => {
          // TODO: Implement actual user listing logic
          return {
            tenantId,
            users: [
              { id: 'user-1', email: 'admin@example.com', role: 'admin' },
              { id: 'user-2', email: 'user@example.com', role: 'user' },
            ],
          };
        }, res);
      },
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    // POST /admin/tenants/:tenantId/users - Add user to tenant (requires tenant-admin role)
    this.addPost(
      '/admin/tenants/:tenantId/users',
      async (req, res) => {
        const { tenantId } = (req as { params: { tenantId: string } }).params;
        const userData = this.jsonUtil.getParsedRequestBody<Record<string, unknown>>(req.body);

        await this.performRequest(
          async () => {
            // TODO: Implement actual user addition logic
            const newUser = {
              id: `user-${Date.now()}`,
              tenantId,
              ...userData,
              createdAt: new Date().toISOString(),
            };
            return newUser;
          },
          res,
          () => 201,
        );
      },
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    return this.getRouter();
  }
}
