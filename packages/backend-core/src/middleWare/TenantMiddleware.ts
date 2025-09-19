import type { NextFunction, Request, Response } from 'express';
import type { ILogWriter } from '../logging/ILogWriter';
// Local TenantContext shape (matches packages/common-models/src/tenant.ts)
export interface TenantContext {
  tenantId: string;
  userId?: string;
  roles?: string[];
  plan?: string;
}

export interface TenantMiddlewareOptions {
  logWriter: ILogWriter;
}

// Extend Express Request with optional tenant fields used by our middleware
export interface AugmentedRequest extends Request {
  tenant?: TenantContext | Record<string, unknown>;
  tenantContext?: TenantContext;
}

export class TenantMiddleware {
  constructor(private readonly opts: TenantMiddlewareOptions) {}

  // Express middleware: assert that req.tenant exists and has a tenantId
  public requireTenant = (req: Request, res: Response, next: NextFunction): void => {
    const aReq = req as AugmentedRequest;
    const tenant = aReq.tenant;

    if (!tenant || typeof tenant.tenantId !== 'string' || tenant.tenantId.trim() === '') {
      this.opts.logWriter.warn('TenantMiddleware: missing tenant in request');
      res.status(403).json({ message: 'Tenant context missing' });
      return;
    }

    // Attach a normalized tenantContext for downstream handlers
    aReq.tenantContext = {
      tenantId: tenant.tenantId,
      userId: (tenant as Record<string, unknown>).userId as string | undefined,
      roles: (tenant as Record<string, unknown>).roles as string[] | undefined,
      plan: (tenant as Record<string, unknown>).plan as string | undefined,
    } as TenantContext;

    next();
  };
}

export default TenantMiddleware;
