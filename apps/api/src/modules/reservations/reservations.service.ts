import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(branchId: string, dto: CreateReservationDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    const reservedFor = new Date(dto.reservedFor);
    const durationMinutes = dto.durationMinutes ?? 90;

    if (dto.tableId) {
      await this.assertNoConflict(
        tenantId,
        branchId,
        dto.tableId,
        reservedFor,
        durationMinutes,
      );
    }

    const reservation = await this.prisma.forTenant(tenantId, (tx) =>
      tx.reservation.create({
        data: {
          tenantId,
          branchId,
          tableId: dto.tableId ?? null,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          partySize: dto.partySize,
          reservedFor,
          durationMinutes,
          notes: dto.notes,
          createdBy: userId,
        },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId,
      action: 'reservations.create',
      entityType: 'Reservation',
      entityId: reservation.id,
    });

    return reservation;
  }

  async list(query: ListReservationsQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.reservation.findMany({
        where: {
          branchId: query.branchId,
          ...(query.from || query.to
            ? {
                reservedFor: {
                  ...(query.from && { gte: new Date(query.from) }),
                  ...(query.to && { lte: new Date(query.to) }),
                },
              }
            : {}),
        },
        orderBy: { reservedFor: 'asc' },
      }),
    );
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const reservation = await this.prisma.forTenant(tenantId, (tx) =>
      tx.reservation.findFirst({ where: { id } }),
    );
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async update(id: string, dto: UpdateReservationDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const existing = await this.findOne(id);

    const tableId = dto.tableId ?? existing.tableId;
    const reservedFor = dto.reservedFor
      ? new Date(dto.reservedFor)
      : existing.reservedFor;
    const durationMinutes = dto.durationMinutes ?? existing.durationMinutes;

    if (tableId && (dto.tableId || dto.reservedFor || dto.durationMinutes)) {
      await this.assertNoConflict(
        tenantId,
        existing.branchId,
        tableId,
        reservedFor,
        durationMinutes,
        id,
      );
    }

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.reservation.update({
        where: { id },
        data: {
          ...dto,
          reservedFor: dto.reservedFor ? new Date(dto.reservedFor) : undefined,
          ...(dto.status === 'cancelled' && { cancelledAt: new Date() }),
        },
      }),
    );

    await this.auditLog.log({
      tenantId,
      userId,
      branchId: existing.branchId,
      action: 'reservations.update',
      entityType: 'Reservation',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }

  /**
   * Conflict check: overlapping time range against other reservations for
   * the same table, plus a check against any currently active dining
   * session occupying that table right now.
   */
  private async assertNoConflict(
    tenantId: string,
    branchId: string,
    tableId: string,
    reservedFor: Date,
    durationMinutes: number,
    excludeReservationId?: string,
  ) {
    const windowStart = reservedFor;
    const windowEnd = new Date(
      reservedFor.getTime() + durationMinutes * 60_000,
    );

    const table = await this.prisma.forTenant(tenantId, (tx) =>
      tx.table.findFirst({ where: { id: tableId, branchId, deletedAt: null } }),
    );
    if (!table) throw new NotFoundException('Table not found at this branch.');

    const candidates = await this.prisma.forTenant(tenantId, (tx) =>
      tx.reservation.findMany({
        where: {
          tableId,
          status: { in: ['pending', 'confirmed', 'seated'] },
          ...(excludeReservationId && { id: { not: excludeReservationId } }),
        },
      }),
    );

    const overlaps = candidates.some((r) => {
      const existingStart = r.reservedFor;
      const existingEnd = new Date(
        r.reservedFor.getTime() + r.durationMinutes * 60_000,
      );
      return windowStart < existingEnd && windowEnd > existingStart;
    });

    if (overlaps) {
      throw new ConflictException(
        `Table is already reserved during that time window.`,
      );
    }

    // If the reservation is for "now" (within the next 15 minutes), also
    // check the table isn't currently mid-service with an active dining
    // session that hasn't been reserved-for elsewhere.
    const isImminent = windowStart.getTime() - Date.now() < 15 * 60_000;
    if (isImminent) {
      const activeSession = await this.prisma.forTenant(tenantId, (tx) =>
        tx.diningSession.findFirst({
          where: { tableId, status: 'active' },
        }),
      );
      if (activeSession) {
        throw new ConflictException(
          'Table is currently occupied. Choose a different table or a later time.',
        );
      }
    }
  }
}
