import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductIngredientDto } from './dto/create-product-ingredient.dto';
import { UpdateProductIngredientDto } from './dto/update-product-ingredient.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductIngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProduct(tenantId: string, productId: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.productIngredient.findMany({
        where: { productId },
        include: { inventoryItem: true },
      }),
    );
  }

  async create(tenantId: string, dto: CreateProductIngredientDto) {
    const item = await this.prisma.forTenant(tenantId, (tx) =>
      tx.inventoryItem.findFirst({
        where: { id: dto.inventoryItemId, deletedAt: null },
      }),
    );
    if (!item) {
      throw new NotFoundException(
        `Inventory item ${dto.inventoryItemId} not found.`,
      );
    }

    try {
      return await this.prisma.forTenant(tenantId, (tx) =>
        tx.productIngredient.create({
          data: {
            tenantId,
            productId: dto.productId,
            inventoryItemId: dto.inventoryItemId,
            quantityUsed: dto.quantityUsed,
          },
        }),
      );
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'This product already has a mapping for that inventory item.',
        );
      }
      throw err;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateProductIngredientDto) {
    const existing = await this.prisma.forTenant(tenantId, (tx) =>
      tx.productIngredient.findFirst({ where: { id } }),
    );
    if (!existing) {
      throw new NotFoundException(
        `Product-ingredient mapping ${id} not found.`,
      );
    }
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.productIngredient.update({
        where: { id },
        data: { quantityUsed: dto.quantityUsed },
      }),
    );
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.forTenant(tenantId, (tx) =>
      tx.productIngredient.findFirst({ where: { id } }),
    );
    if (!existing) {
      throw new NotFoundException(
        `Product-ingredient mapping ${id} not found.`,
      );
    }
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.productIngredient.delete({ where: { id } }),
    );
  }
}
