import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from './tenant-context.service';

export interface AuthenticatedRequest extends Request {
  auth?: {
    tenantId: string;
    userId: string;
    branchIds: string[];
    isAllBranches: boolean;
    roles: string[];
    permissions: string[];
  };
}

/**
 * Decodes the JWT access token (if present), verifies it, and populates
 * both `req.auth` and the AsyncLocalStorage-backed TenantContextService
 * for the lifetime of the request. Runs BEFORE guards so that permission
 * guards and Prisma calls have tenant context available.
 *
 * This middleware does not itself reject unauthenticated requests — routes
 * that require auth are protected by JwtAuthGuard. Public routes (e.g.
 * /auth/login) simply won't have `req.auth` populated.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantContext: TenantContextService,
  ) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      const context = {
        tenantId: payload.tenantId,
        userId: payload.sub,
        branchIds: payload.branchIds ?? [],
        isAllBranches: payload.isAllBranches ?? false,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
      };

      req.auth = context;

      this.tenantContext.run(context, () => next());
    } catch {
      // Invalid/expired token: do not throw here, let JwtAuthGuard on the
      // route handle the 401 so public routes remain unaffected.
      next();
    }
  }
}
