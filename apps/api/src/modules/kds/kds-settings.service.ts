import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateKdsSettingsDto } from './dto/update-kds-settings.dto';

@Injectable()
export class KdsSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getSettings(tenantId: string, branchId: string) {
    const settings = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branchKdsSettings.findFirst({ where: { tenantId, branchId } }),
    );

    if (settings) return settings;

    // Default: printing off, no printer configured, until explicitly set.
    return {
      id: null,
      tenantId,
      branchId,
      ticketPrintingEnabled: false,
      printerConnectionType: null,
      printerHost: null,
      printerPort: null,
    };
  }

  async updateSettings(
    tenantId: string,
    branchId: string,
    dto: UpdateKdsSettingsDto,
    userId: string,
  ) {
    const updated = await this.prisma.forTenant(tenantId, async (tx) => {
      const existing = await tx.branchKdsSettings.findFirst({
        where: { tenantId, branchId },
      });

      const data = {
        tenantId,
        branchId,
        ticketPrintingEnabled: dto.ticketPrintingEnabled,
        printerConnectionType: dto.ticketPrintingEnabled
          ? (dto.printerConnectionType ?? null)
          : null,
        printerHost: dto.ticketPrintingEnabled
          ? (dto.printerHost ?? null)
          : null,
        printerPort: dto.ticketPrintingEnabled
          ? (dto.printerPort ?? null)
          : null,
      };

      if (existing) {
        return tx.branchKdsSettings.update({
          where: { id: existing.id },
          data,
        });
      }
      return tx.branchKdsSettings.create({ data });
    });

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'kds.settings.updated',
      entityType: 'branch_kds_settings',
      entityId: updated.id,
      metadata: { ticketPrintingEnabled: dto.ticketPrintingEnabled },
    });

    return updated;
  }
}
