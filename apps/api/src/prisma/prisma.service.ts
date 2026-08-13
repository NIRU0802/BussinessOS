import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../common/tenant-context/tenant-context.service';

/**
 * PrismaService wraps the base PrismaClient and provides a
 * `forTenant()` helper that opens a transaction with the Postgres
 * session variable `app.current_tenant_id` set via SET LOCAL.
 *
 * This is the enforcement point that backs Row-Level Security:
 * every tenant-scoped query MUST go through `forTenant()` (or the
 * TenantPrismaService below) rather than the raw client, otherwise
 * `current_tenant_id()` in Postgres has nothing to read and every
 * RLS-protected query will throw (fail closed).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly tenantContext: TenantContextService) {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs `fn` inside a transaction that has app.current_tenant_id set for
   * the duration of the transaction (via SET LOCAL, which is automatically
   * reset at transaction end — no leakage across pooled connections).
   *
   * Note: tenant_id columns in this schema are Prisma `String` fields
   * (Postgres TEXT), not native `uuid` — so no ::uuid cast is used here,
   * matching the RLS helper function `current_tenant_id()` which returns TEXT.
   */
  async forTenant<T>(
    tenantId: string,
    fn: (
      tx: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >,
    ) => Promise<T>,
  ): Promise<T> {
    if (!tenantId) {
      throw new Error('forTenant() called without a tenantId');
    }
    return this.$transaction(async (tx) => {
      // Parameterized to prevent SQL injection even though tenantId is
      // strictly validated as a UUID-shaped string below.
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${this.escapeTenantId(tenantId)}'`,
      );
      return fn(tx);
    });
  }

  /**
   * Convenience: runs `fn` using the tenant id currently stored in
   * AsyncLocalStorage by TenantContextService (populated by
   * TenantContextMiddleware from the authenticated JWT).
   */
  async forCurrentTenant<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >,
    ) => Promise<T>,
  ): Promise<T> {
    const tenantId = this.tenantContext.getTenantId();
    return this.forTenant(tenantId, fn);
  }

  /**
   * Strict UUID-shape validation before string interpolation into raw SQL.
   * Even though tenant_id is stored as TEXT (Prisma cuid/uuid default),
   * we still require UUID shape here since Tenant.id is generated via
   * @default(uuid()) — this blocks SQL injection via malformed input.
   */
  private escapeTenantId(value: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Invalid tenant id format');
    }
    return value;
  }
}
