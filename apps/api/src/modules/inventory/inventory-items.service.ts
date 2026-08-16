import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateInventoryItemDto) {
    try {
      return await this.prisma.forTenant(tenantId, (tx) =>
        tx.inventoryItem.create({
          data: {
            tenantId,
            name: dto.name,
            unit: dto.unit,
            costPerUnit: dto.costPerUnit,
            isActive: dto.isActive ?? true,
          },
        }),
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `An inventory item named "${dto.name}" already exists.`,
        );
      }
      throw err;
    }
  }

  async list(tenantId: string, includeInactive = false) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.inventoryItem.findMany({
        where: {
          deletedAt: null,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.forTenant(tenantId, (tx) =>
      tx.inventoryItem.findFirst({ where: { id, deletedAt: null } }),
    );
    if (!item) {
      throw new NotFoundException(`Inventory item ${id} not found.`);
    }
    return item;
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryItemDto) {
    await this.findOne(tenantId, id);
    try {
      return await this.prisma.forTenant(tenantId, (tx) =>
        tx.inventoryItem.update({
          where: { id },
          data: {
            name: dto.name,
            unit: dto.unit,
            costPerUnit: dto.costPerUnit,
            isActive: dto.isActive,
          },
        }),
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `An inventory item named "${dto.name}" already exists.`,
        );
      }
      throw err;
    }
  }

  async softDelete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.inventoryItem.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    );
  }
}
