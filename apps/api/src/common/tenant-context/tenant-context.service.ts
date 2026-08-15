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
 * TenantContextMiddleware from the verified staff JWT payload, OR by
 * QrSessionGuard (Phase 6) from a verified QR table token for anonymous
 * customer requests.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantRequestContext>();

  run<T>(context: TenantRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Sets the context for the remainder of the current asynchronous
   * execution without requiring a wrapping callback. Used by guards
   * (e.g. QrSessionGuard) which cannot wrap the downstream handler chain
   * the way middleware's `next()` callback can. Safe here because guards,
   * interceptors, and the route handler all execute within the same
   * continuous async chain as the originating request.
   */
  enterWith(context: TenantRequestContext): void {
    this.storage.enterWith(context);
  }

  getContext(): TenantRequestContext {
    const ctx = this.storage.getStore();
    if (!ctx) {
      throw new Error(
        'TenantContext accessed outside of a request scope. Ensure TenantContextMiddleware or QrSessionGuard ran.',
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
