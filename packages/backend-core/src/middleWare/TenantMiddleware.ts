import { NextFunction, Request, Response } from 'express';
import { ILogWriter } from '../logging/ILogWriter';
// Local TenantContext shape (matches packages/common-models/src/tenant.ts)
export type TenantContext = {
  tenantId: string;
  userId?: string;
  roles?: string[];
  plan?: string;
};

export interface TenantMiddlewareOptions {
  logWriter: ILogWriter;
}

// Extend Express Request with optional tenant fields used by our middleware
export interface AugmentedRequest extends Request {
  tenant?: TenantContext | Record<string, any>;
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
      userId: (tenant as any).userId,
      roles: (tenant as any).roles,
      plan: (tenant as any).plan,
    } as TenantContext;

    next();
  };
}

export default TenantMiddleware;
