import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../tenant-context/tenant-context.middleware';

/**
 * Verifies the authenticated user has access to the branch referenced by
 * `:branchId` route param (or `branchId` query/body field), unless they
 * have all-branch access (Owners). Apply this guard on any branch-scoped
 * route.
 */
@Injectable()
export class BranchAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.auth;

    if (!auth) {
      throw new ForbiddenException('Not authenticated');
    }

    if (auth.isAllBranches) {
      return true;
    }

    const branchId =
      req.params?.branchId || req.query?.branchId || req.body?.branchId;

    if (!branchId) {
      // No branch specified on this route — nothing to check here.
      return true;
    }

    if (!auth.branchIds.includes(branchId)) {
      throw new ForbiddenException('No access to this branch');
    }

    return true;
  }
}
