import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantRequestContext {
  tenantId: string;
  userId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
}

/**
 * Holds the current request's tenant/user context using AsyncLocalStorage
 * so it's accessible anywhere in the call stack (services, Prisma layer)
 * without threading it through every function signature. Populated by
 * TenantContextMiddleware from the verified JWT payload.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantRequestContext>();

  run<T>(context: TenantRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): TenantRequestContext {
    const ctx = this.storage.getStore();
    if (!ctx) {
      throw new Error(
        'TenantContext accessed outside of a request scope. Ensure TenantContextMiddleware ran.',
      );
    }
    return ctx;
  }

  /** Returns context or null if outside request scope (does not throw). */
  tryGetContext(): TenantRequestContext | null {
    return this.storage.getStore() ?? null;
  }

  getTenantId(): string {
    return this.getContext().tenantId;
  }

  getUserId(): string {
    return this.getContext().userId;
  }

  getBranchIds(): string[] {
    return this.getContext().branchIds;
  }

  hasAllBranchAccess(): boolean {
    return this.getContext().isAllBranches;
  }

  getRoles(): string[] {
    return this.getContext().roles;
  }

  getPermissions(): string[] {
    return this.getContext().permissions;
  }
}
