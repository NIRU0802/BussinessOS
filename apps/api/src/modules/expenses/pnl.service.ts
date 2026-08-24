import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PnlQueryDto } from './dto/pnl-query.dto';

interface TenantContext {
  tenantId: string;
  userId: string;
  branchIds: string[];
  isAllBranches: boolean;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class PnlService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfitAndLoss(ctx: TenantContext, query: PnlQueryDto) {
    if (query.branchId) {
      if (!ctx.isAllBranches && !ctx.branchIds.includes(query.branchId)) {
        throw new ForbiddenException('You do not have access to this branch');
      }
    } else if (!ctx.permissions.includes('reports.read_all_branches')) {
      throw new ForbiddenException(
        'Tenant-wide P&L requires reports.read_all_branches — specify a branchId instead',
      );
    }

    const fromDate = new Date(query.fromDate);
    const toDate = new Date(query.toDate);

    const branchFilter = query.branchId
      ? [query.branchId]
      : ctx.isAllBranches
        ? undefined
        : ctx.branchIds;

    return this.prisma.forTenant(ctx.tenantId, async (tx) => {
      // Revenue: paid orders in range
      const revenueAgg = await tx.order.aggregate({
        where: {
          tenantId: ctx.tenantId,
          status: 'paid',
          ...(branchFilter ? { branchId: { in: branchFilter } } : {}),
          createdAt: { gte: fromDate, lte: toDate },
        },
        _sum: { total: true },
        _count: true,
      });

      // Expenses by category in range
      const expenseGroups = await tx.expense.groupBy({
        by: ['categoryId'],
        where: {
          tenantId: ctx.tenantId,
          deletedAt: null,
          ...(branchFilter ? { branchId: { in: branchFilter } } : {}),
          expenseDate: { gte: fromDate, lte: toDate },
        },
        _sum: { amount: true },
      });

      const categories = await tx.expenseCategory.findMany({
        where: { tenantId: ctx.tenantId },
      });
      const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

      const expensesByCategory = expenseGroups.map((group) => ({
        categoryId: group.categoryId,
        categoryName: categoryNameMap.get(group.categoryId) ?? 'Unknown',
        total: Number(group._sum.amount ?? 0),
      }));

      const totalRevenue = Number(revenueAgg._sum.total ?? 0);
      const totalExpenses = expensesByCategory.reduce(
        (sum, c) => sum + c.total,
        0,
      );

      return {
        period: { fromDate: query.fromDate, toDate: query.toDate },
        scope: query.branchId
          ? { branchId: query.branchId }
          : { tenantWide: true },
        revenue: {
          total: totalRevenue,
          paidOrderCount: revenueAgg._count,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory.sort((a, b) => b.total - a.total),
        },
        netProfit: totalRevenue - totalExpenses,
      };
    });
  }
}
