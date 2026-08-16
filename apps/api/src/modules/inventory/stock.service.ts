import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SetLowStockThresholdDto } from './dto/set-low-stock-threshold.dto';
import {
  INVENTORY_EVENTS,
  InventoryLowStockEvent,
} from './events/inventory.events';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listForBranch(tenantId: string, branchId: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.stockLevel.findMany({
        where: { branchId },
        include: { inventoryItem: true },
        orderBy: { inventoryItem: { name: 'asc' } },
      }),
    );
  }

  async getLowStockSummary(tenantId: string, branchId?: string) {
    const levels = await this.prisma.forTenant(tenantId, (tx) =>
      tx.stockLevel.findMany({
        where: {
          ...(branchId ? { branchId } : {}),
        },
        include: { inventoryItem: true },
      }),
    );
    return levels
      .filter((level) =>
        level.currentQuantity.lessThan(level.lowStockThreshold),
      )
      .map((level) => ({
        branchId: level.branchId,
        inventoryItemId: level.inventoryItemId,
        inventoryItemName: level.inventoryItem.name,
        unit: level.inventoryItem.unit,
        currentQuantity: level.currentQuantity.toString(),
        lowStockThreshold: level.lowStockThreshold.toString(),
      }));
  }

  async setLowStockThreshold(tenantId: string, dto: SetLowStockThresholdDto) {
    await this.assertInventoryItemExists(tenantId, dto.inventoryItemId);
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.stockLevel.upsert({
        where: {
          branchId_inventoryItemId: {
            branchId: dto.branchId,
            inventoryItemId: dto.inventoryItemId,
          },
        },
        update: { lowStockThreshold: dto.lowStockThreshold },
        create: {
          tenantId,
          branchId: dto.branchId,
          inventoryItemId: dto.inventoryItemId,
          currentQuantity: 0,
          lowStockThreshold: dto.lowStockThreshold,
        },
      }),
    );
  }

  /**
   * Manual stock adjustment (purchase, manual_adjustment, waste). Every
   * call writes a stock_movements audit row AND an audit_logs entry —
   * nothing silently changes stock.
   */
  async adjustStock(user: AuthenticatedUser, dto: AdjustStockDto) {
    await this.assertInventoryItemExists(user.tenantId, dto.inventoryItemId);

    const { updatedLevel, previousQuantity } = await this.prisma.forTenant(
      user.tenantId,
      async (tx) => {
        const existing = await tx.stockLevel.upsert({
          where: {
            branchId_inventoryItemId: {
              branchId: dto.branchId,
              inventoryItemId: dto.inventoryItemId,
            },
          },
          update: {},
          create: {
            tenantId: user.tenantId,
            branchId: dto.branchId,
            inventoryItemId: dto.inventoryItemId,
            currentQuantity: 0,
            lowStockThreshold: 0,
          },
        });

        const newQuantity =
          existing.currentQuantity.toNumber() + dto.changeAmount;
        if (newQuantity < 0) {
          throw new BadRequestException(
            `Adjustment would result in negative stock (${newQuantity}). Current quantity is ${existing.currentQuantity.toString()}.`,
          );
        }

        const updated = await tx.stockLevel.update({
          where: {
            branchId_inventoryItemId: {
              branchId: dto.branchId,
              inventoryItemId: dto.inventoryItemId,
            },
          },
          data: { currentQuantity: newQuantity },
          include: { inventoryItem: true },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            branchId: dto.branchId,
            inventoryItemId: dto.inventoryItemId,
            changeAmount: dto.changeAmount,
            movementType: dto.movementType,
            reason: dto.reason,
            performedBy: user.userId,
          },
        });

        return {
          updatedLevel: updated,
          previousQuantity: existing.currentQuantity.toNumber(),
        };
      },
    );

    await this.auditLog.log({
      tenantId: user.tenantId,
      branchId: dto.branchId,
      userId: user.userId,
      action: 'inventory.stock_adjusted',
      entityType: 'InventoryItem',
      entityId: dto.inventoryItemId,
      metadata: {
        changeAmount: dto.changeAmount,
        movementType: dto.movementType,
        reason: dto.reason,
        previousQuantity,
        newQuantity: updatedLevel.currentQuantity.toString(),
      },
    });

    this.checkAndEmitLowStock(
      user.tenantId,
      dto.branchId,
      updatedLevel,
      previousQuantity,
    );

    return updatedLevel;
  }

  /**
   * Called by the order.paid listener — deducts stock per product_ingredients
   * mapping and writes a 'sale_deduction' movement. Not exposed via HTTP.
   */
  async deductForSale(params: {
    tenantId: string;
    branchId: string;
    inventoryItemId: string;
    quantityToDeduct: number;
    orderId: string;
  }) {
    const { tenantId, branchId, inventoryItemId, quantityToDeduct, orderId } =
      params;

    const { updatedLevel, previousQuantity } = await this.prisma.forTenant(
      tenantId,
      async (tx) => {
        const existing = await tx.stockLevel.upsert({
          where: { branchId_inventoryItemId: { branchId, inventoryItemId } },
          update: {},
          create: {
            tenantId,
            branchId,
            inventoryItemId,
            currentQuantity: 0,
            lowStockThreshold: 0,
          },
        });

        // Deliberately NOT throwing on negative here — a POS sale that has
        // already been paid for must not be blocked retroactively by a
        // stock mismatch. Negative stock is a signal for the manager to
        // reconcile, not a reason to fail a completed transaction.
        const newQuantity =
          existing.currentQuantity.toNumber() - quantityToDeduct;

        const updated = await tx.stockLevel.update({
          where: { branchId_inventoryItemId: { branchId, inventoryItemId } },
          data: { currentQuantity: newQuantity },
          include: { inventoryItem: true },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            branchId,
            inventoryItemId,
            changeAmount: -quantityToDeduct,
            movementType: 'sale_deduction',
            reason: null,
            performedBy: null,
            referenceOrderId: orderId,
          },
        });

        return {
          updatedLevel: updated,
          previousQuantity: existing.currentQuantity.toNumber(),
        };
      },
    );

    this.checkAndEmitLowStock(
      tenantId,
      branchId,
      updatedLevel,
      previousQuantity,
    );

    return updatedLevel;
  }

  private checkAndEmitLowStock(
    tenantId: string,
    branchId: string,
    updatedLevel: {
      inventoryItemId: string;
      currentQuantity: { toNumber: () => number; toString: () => string };
      lowStockThreshold: { toNumber: () => number; toString: () => string };
      inventoryItem: { name: string; unit: string };
    },
    previousQuantity: number,
  ) {
    const threshold = updatedLevel.lowStockThreshold.toNumber();
    const newQuantity = updatedLevel.currentQuantity.toNumber();
    const crossedBelowThreshold =
      previousQuantity >= threshold && newQuantity < threshold;

    if (crossedBelowThreshold) {
      this.eventEmitter.emit(INVENTORY_EVENTS.LOW_STOCK, {
        tenantId,
        branchId,
        inventoryItemId: updatedLevel.inventoryItemId,
        inventoryItemName: updatedLevel.inventoryItem.name,
        currentQuantity: updatedLevel.currentQuantity.toString(),
        lowStockThreshold: updatedLevel.lowStockThreshold.toString(),
        unit: updatedLevel.inventoryItem.unit,
      } satisfies InventoryLowStockEvent);
    }
  }

  private async assertInventoryItemExists(
    tenantId: string,
    inventoryItemId: string,
  ) {
    const item = await this.prisma.forTenant(tenantId, (tx) =>
      tx.inventoryItem.findFirst({
        where: { id: inventoryItemId, deletedAt: null },
      }),
    );
    if (!item) {
      throw new NotFoundException(
        `Inventory item ${inventoryItemId} not found.`,
      );
    }
  }
}
