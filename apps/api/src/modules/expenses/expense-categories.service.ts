import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

const DEFAULT_CATEGORIES = [
  'Rent',
  'Electricity',
  'Salaries',
  'Ingredients',
  'Maintenance',
  'Other',
];

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Listens for tenant creation (adjust event name to match your actual
  // tenant-registration event emitter if it differs from 'tenant.created').
  @OnEvent('tenant.created')
  async seedDefaultCategories(payload: { tenantId: string }) {
    await this.prisma.forTenant(payload.tenantId, async (tx) => {
      await tx.expenseCategory.createMany({
        data: DEFAULT_CATEGORIES.map((name) => ({
          tenantId: payload.tenantId,
          name,
          isDefault: true,
        })),
        skipDuplicates: true,
      });
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.forTenant(tenantId, async (tx) => {
      return tx.expenseCategory.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      });
    });
  }

  async create(tenantId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.forTenant(tenantId, async (tx) => {
      const existing = await tx.expenseCategory.findFirst({
        where: { tenantId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A category with this name already exists');
      }
      return tx.expenseCategory.create({
        data: { tenantId, name: dto.name, isDefault: false },
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateExpenseCategoryDto) {
    return this.prisma.forTenant(tenantId, async (tx) => {
      const category = await tx.expenseCategory.findFirst({
        where: { id, tenantId },
      });
      if (!category) {
        throw new NotFoundException('Expense category not found');
      }
      if (dto.name && dto.name !== category.name) {
        const clash = await tx.expenseCategory.findFirst({
          where: { tenantId, name: dto.name, id: { not: id } },
        });
        if (clash) {
          throw new ConflictException(
            'A category with this name already exists',
          );
        }
      }
      return tx.expenseCategory.update({
        where: { id },
        data: { name: dto.name },
      });
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.forTenant(tenantId, async (tx) => {
      const category = await tx.expenseCategory.findFirst({
        where: { id, tenantId },
        include: { _count: { select: { expenses: true } } },
      });
      if (!category) {
        throw new NotFoundException('Expense category not found');
      }
      if (category._count.expenses > 0) {
        throw new ConflictException(
          'Cannot delete a category that has expenses logged against it',
        );
      }
      return tx.expenseCategory.delete({ where: { id } });
    });
  }
}
