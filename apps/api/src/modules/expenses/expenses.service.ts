import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../common/storage/minio.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

interface TenantContext {
  tenantId: string;
  userId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly auditLog: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private assertBranchAccess(ctx: TenantContext, branchId: string) {
    if (!ctx.isAllBranches && !ctx.branchIds.includes(branchId)) {
      throw new ForbiddenException('You do not have access to this branch');
    }
  }

  async findAll(ctx: TenantContext, query: QueryExpensesDto) {
    if (query.branchId) {
      this.assertBranchAccess(ctx, query.branchId);
    }

    const branchFilter = query.branchId
      ? [query.branchId]
      : ctx.isAllBranches
        ? undefined
        : ctx.branchIds;

    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
      ...(branchFilter ? { branchId: { in: branchFilter } } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            expenseDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const { items, total } = await this.prisma.forTenant(
      ctx.tenantId,
      async (tx) => {
        const [items, total] = await Promise.all([
          tx.expense.findMany({
            where,
            include: {
              category: true,
              branch: { select: { id: true, name: true } },
            },
            orderBy: { expenseDate: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          tx.expense.count({ where }),
        ]);
        return { items, total };
      },
    );

    const itemsWithUrls = await Promise.all(
      items.map(async (item) => ({
        ...item,
        receiptUrl: item.receiptObjectKey
          ? await this.minio.getSignedReadUrl(item.receiptObjectKey)
          : null,
      })),
    );

    return {
      items: itemsWithUrls,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(ctx: TenantContext, id: string) {
    const expense = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      return tx.expense.findFirst({
        where: { id, tenantId: ctx.tenantId, deletedAt: null },
        include: {
          category: true,
          branch: { select: { id: true, name: true } },
        },
      });
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    this.assertBranchAccess(ctx, expense.branchId);

    return {
      ...expense,
      receiptUrl: expense.receiptObjectKey
        ? await this.minio.getSignedReadUrl(expense.receiptObjectKey)
        : null,
    };
  }

  async create(
    ctx: TenantContext,
    dto: CreateExpenseDto,
    receiptFile?: Express.Multer.File,
  ) {
    this.assertBranchAccess(ctx, dto.branchId);

    let receiptObjectKey: string | null = null;
    if (receiptFile) {
      const uploadResult = await this.minio.uploadFile({
        tenantId: ctx.tenantId,
        namespace: 'receipts',
        buffer: receiptFile.buffer,
        mimeType: receiptFile.mimetype,
        originalFilename: receiptFile.originalname,
      });
      receiptObjectKey = uploadResult.objectKey;
    }

    const expense = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      const category = await tx.expenseCategory.findFirst({
        where: { id: dto.categoryId, tenantId: ctx.tenantId },
      });
      if (!category) {
        throw new BadRequestException('Invalid expense category');
      }

      return tx.expense.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: dto.branchId,
          categoryId: dto.categoryId,
          amount: dto.amount,
          description: dto.description,
          expenseDate: new Date(dto.expenseDate),
          receiptObjectKey,
          createdBy: ctx.userId,
        },
        include: { category: true },
      });
    });

    await this.auditLog.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'expense.created',
      entityType: 'Expense',
      entityId: expense.id,
      metadata: { amount: expense.amount, branchId: expense.branchId },
    });

    this.eventEmitter.emit('expense.created', {
      tenantId: ctx.tenantId,
      branchId: expense.branchId,
      expenseId: expense.id,
      amount: expense.amount,
    });

    return expense;
  }

  async update(
    ctx: TenantContext,
    id: string,
    dto: UpdateExpenseDto,
    receiptFile?: Express.Multer.File,
  ) {
    const existing = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      return tx.expense.findFirst({
        where: { id, tenantId: ctx.tenantId, deletedAt: null },
      });
    });
    if (!existing) {
      throw new NotFoundException('Expense not found');
    }
    this.assertBranchAccess(ctx, existing.branchId);

    if (dto.categoryId) {
      const categoryCheck = await this.prisma.forTenant(
        ctx.tenantId,
        async (tx) => {
          return tx.expenseCategory.findFirst({
            where: { id: dto.categoryId, tenantId: ctx.tenantId },
          });
        },
      );
      if (!categoryCheck) {
        throw new BadRequestException('Invalid expense category');
      }
    }

    let receiptObjectKey = existing.receiptObjectKey;
    if (receiptFile) {
      const uploadResult = await this.minio.uploadFile({
        tenantId: ctx.tenantId,
        namespace: 'receipts',
        buffer: receiptFile.buffer,
        mimeType: receiptFile.mimetype,
        originalFilename: receiptFile.originalname,
      });
      receiptObjectKey = uploadResult.objectKey;
    }

    const updated = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      return tx.expense.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          amount: dto.amount,
          description: dto.description,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
          receiptObjectKey,
        },
        include: { category: true },
      });
    });

    await this.auditLog.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'expense.updated',
      entityType: 'Expense',
      entityId: updated.id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async remove(ctx: TenantContext, id: string) {
    const existing = await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      return tx.expense.findFirst({
        where: { id, tenantId: ctx.tenantId, deletedAt: null },
      });
    });
    if (!existing) {
      throw new NotFoundException('Expense not found');
    }
    this.assertBranchAccess(ctx, existing.branchId);

    await this.prisma.forTenant(ctx.tenantId, async (tx) => {
      await tx.expense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    await this.auditLog.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'expense.deleted',
      entityType: 'Expense',
      entityId: id,
      metadata: { amount: existing.amount, branchId: existing.branchId },
    });

    return { success: true };
  }
}
