import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface RecordAuditParams {
  superAdminId: string;
  adminTypeAtTime: 'GR8' | 'TEAM';
  targetTenantId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SuperAdminAuditService {
  private readonly logger = new Logger(SuperAdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditParams): Promise<void> {
    try {
      await this.prisma.superAdminAuditLog.create({
        data: {
          super_admin_id: params.superAdminId,
          admin_type_at_time: params.adminTypeAtTime,
          target_tenant_id: params.targetTenantId ?? null,
          action: params.action,
          resource_type: params.resourceType,
          resource_id: params.resourceId ?? null,
          metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
          ip_address: params.ipAddress,
          user_agent: params.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(
        `FAILED TO WRITE SUPER ADMIN AUDIT LOG: ${JSON.stringify(params)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }
}
