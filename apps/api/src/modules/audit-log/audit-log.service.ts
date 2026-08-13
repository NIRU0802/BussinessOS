import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  tenantId: string;
  branchId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes an audit log entry. Uses forTenant() directly (rather than
   * forCurrentTenant()) because this can be called from contexts like the
   * auth module BEFORE a full request-scoped tenant context exists (e.g.
   * during login, where we only know tenantId post-authentication).
   *
   * Audit log writes must never throw and break the calling business
   * operation — failures are logged but swallowed.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.forTenant(entry.tenantId, (tx) =>
        tx.auditLog.create({
          data: {
            tenantId: entry.tenantId,
            branchId: entry.branchId,
            userId: entry.userId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            metadata: entry.metadata as any,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
          },
        }),
      );
    } catch (err) {
      this.logger.error(
        `Failed to write audit log for action "${entry.action}": ${err}`,
      );
    }
  }

  async listForTenant(
    tenantId: string,
    filters: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      take?: number;
      skip?: number;
    } = {},
  ) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.auditLog.findMany({
        where: {
          entityType: filters.entityType,
          entityId: filters.entityId,
          userId: filters.userId,
        },
        orderBy: { createdAt: 'desc' },
        take: filters.take ?? 50,
        skip: filters.skip ?? 0,
      }),
    );
  }
}
