import type {
  AuthorizationRequirement,
  HttpMiddleware,
  HttpResponse,
  HttpRouter,
  ILogWriter,
  JsonUtil,
} from '@ayeldo/backend-core';
import { ClaimAuthorizedController } from '@ayeldo/backend-core';
import { requireCsrfForController } from '../middleware/csrfGuard';
import type { SessionService } from '../services/sessionService';
import type { TenantService } from '../services/tenantService';

export interface TenantAdminControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly jsonUtil: JsonUtil;
  readonly sessionService: SessionService;
  readonly authorizer:
    | HttpMiddleware
    | ((requirement?: AuthorizationRequirement) => HttpMiddleware);
  readonly tenantService: TenantService;
}

/**
 * Admin controller for tenant management operations.
 * Requires authentication via session and JWT validation with admin claims.
 */
export class TenantAdminController extends ClaimAuthorizedController {
  private readonly sessionService: SessionService;
  private readonly jsonUtil: JsonUtil;
  private readonly tenantService: TenantService;

  public constructor(props: TenantAdminControllerProps) {
    super(props.baseUrl, props.logWriter, props.authorizer);
    this.sessionService = props.sessionService;
    this.jsonUtil = props.jsonUtil;
    this.tenantService = props.tenantService;
  }

  public initialize(): HttpRouter {
    // GET /admin/tenants - List all tenants (requires tenant-admin role)
    this.addGet(
      '/admin/tenants',
      async (_req, res) => {
        await this.performRequest(
          async () => {
            // TODO: Implement actual tenant listing logic
            return {
              tenants: [
                { id: 'tenant-1', name: 'Demo Tenant 1', status: 'active' },
                { id: 'tenant-2', name: 'Demo Tenant 2', status: 'inactive' },
              ],
            };
          },
          res as unknown as HttpResponse,
        );
      },
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    // POST /admin/tenants - Create a new tenant (requires super-admin role)
    this.addPost(
      '/admin/tenants',
      requireCsrfForController(async (req, res) => {
        // Delegate to TenantService which handles parsing, validation, persistence and eventing
        await this.performRequest(
          () =>
            this.tenantService.createTenantFromRequest((req as unknown as { body: unknown }).body),
          res as unknown as HttpResponse,
          () => 201,
        );
      }),
      { requiredValues: ['super-admin'] },
    );

    // PUT /admin/tenants/:tenantId - Update tenant (requires tenant-admin role)
    this.addPut(
      '/admin/tenants/:tenantId',
      requireCsrfForController(async (req, res) => {
        const { tenantId } = (req as unknown as { params: { tenantId: string } }).params;
        const updateData = this.jsonUtil.getParsedRequestBody<Record<string, unknown>>(
          (req as unknown as { body: unknown }).body,
        );

        await this.performRequest(
          async () => {
            // TODO: Implement actual tenant update logic
            const updatedTenant = {
              id: tenantId,
              ...updateData,
              updatedAt: new Date().toISOString(),
            };
            return updatedTenant;
          },
          res as unknown as HttpResponse,
        );
      }),
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    // DELETE /admin/tenants/:tenantId - Delete tenant (requires super-admin role)
    this.addDelete(
      '/admin/tenants/:tenantId',
      requireCsrfForController(async (req, res) => {
        const { tenantId } = (req as unknown as { params: { tenantId: string } }).params;

        await this.performRequest(
          async () => {
            // TODO: Implement actual tenant deletion logic
            return { id: tenantId, deleted: true };
          },
          res as unknown as HttpResponse,
          () => 204,
        );
      }),
      { requiredValues: ['super-admin'] },
    );

    // GET /admin/tenants/:tenantId/users - List users in a tenant (requires tenant-admin role)
    this.addGet(
      '/admin/tenants/:tenantId/users',
      async (req, res) => {
        const { tenantId } = (req as unknown as { params: { tenantId: string } }).params;

        await this.performRequest(
          async () => {
            // TODO: Implement actual user listing logic
            return {
              tenantId,
              users: [
                { id: 'user-1', email: 'admin@example.com', role: 'admin' },
                { id: 'user-2', email: 'user@example.com', role: 'user' },
              ],
            };
          },
          res as unknown as HttpResponse,
        );
      },
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    // POST /admin/tenants/:tenantId/users - Add user to tenant (requires tenant-admin role)
    this.addPost(
      '/admin/tenants/:tenantId/users',
      requireCsrfForController(async (req, res) => {
        const { tenantId } = (req as unknown as { params: { tenantId: string } }).params;
        const userData = this.jsonUtil.getParsedRequestBody<Record<string, unknown>>(
          (req as unknown as { body: unknown }).body,
        );

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
          res as unknown as HttpResponse,
          () => 201,
        );
      }),
      { requiredValues: ['tenant-admin', 'super-admin'] },
    );

    return this.getRouter();
  }
}
