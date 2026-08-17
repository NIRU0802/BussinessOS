import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { ReportPeriod, BestSellerSortBy } from './enums/report-period.enum';
import { SalesSummaryQueryDto } from './dto/sales-summary-query.dto';
import { BestSellersQueryDto } from './dto/best-sellers-query.dto';
import { BranchRollupQueryDto } from './dto/branch-rollup-query.dto';
import {
  SalesSummaryResult,
  SalesSummaryPoint,
  BestSellerItem,
  BranchRollupResult,
  BranchRollupBreakdown,
} from './interfaces/report-results.interface';

// Maps our period enum to a Postgres date_trunc() field argument.
const PERIOD_TO_TRUNC: Record<ReportPeriod, string> = {
  [ReportPeriod.DAY]: 'day',
  [ReportPeriod.WEEK]: 'week',
  [ReportPeriod.MONTH]: 'month',
};

// Only 'paid' orders count as completed sales for reporting purposes.
// Other statuses (open, held, voided, refunded) are excluded from revenue figures.
const SALES_STATUS = 'paid';

// Valid OrderChannel enum values, confirmed against the DB:
// pos, qr, delivery_zomato, delivery_swiggy, delivery_ubereats, whatsapp, phone

const MAX_RANGE_DAYS = 400; // guardrail against unbounded aggregation queries

interface RawSalesRow {
  period_start: Date;
  branch_id: string | null;
  branch_name: string | null;
  channel: string | null;
  order_count: bigint;
  subtotal: string | null;
  tax_amount: string | null;
  total: string | null;
}

interface RawBestSellerRow {
  product_id: string;
  item_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  quantity_sold: bigint;
  revenue: string | null;
  order_count: bigint;
}

interface RawRollupRow {
  branch_id: string;
  branch_name: string;
  order_count: bigint;
  subtotal: string | null;
  tax_amount: string | null;
  total: string | null;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Resolves and validates the set of branch IDs a request is allowed to query.
   * - If the caller has isAllBranchAccess, requested branchIds (or all branches if
   *   none requested) are honored.
   * - Otherwise, requested branchIds must be a subset of the caller's assigned
   *   branchIds; if none requested, defaults to the caller's assigned branchIds.
   */
  private resolveAccessibleBranchIds(requested?: string[]): string[] | null {
    const ctx = this.tenantContext.getContext();

    if (ctx.isAllBranches) {
      return requested && requested.length > 0 ? requested : null; // null = no branch filter (all branches)
    }

    const assigned = ctx.branchIds ?? [];
    if (assigned.length === 0) {
      throw new ForbiddenException('No branches assigned to this user.');
    }

    if (!requested || requested.length === 0) {
      return assigned;
    }

    const disallowed = requested.filter((id) => !assigned.includes(id));
    if (disallowed.length > 0) {
      throw new ForbiddenException(
        `Access denied to branch(es): ${disallowed.join(', ')}`,
      );
    }

    return requested;
  }

  private validateDateRange(
    startDate: string,
    endDate: string,
  ): { start: Date; end: Date } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate.');
    }
    if (start >= end) {
      throw new BadRequestException('startDate must be before endDate.');
    }

    const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range too large. Maximum allowed range is ${MAX_RANGE_DAYS} days.`,
      );
    }

    return { start, end };
  }

  private toNumber(value: string | null): number {
    return value === null ? 0 : Math.round(parseFloat(value) * 100) / 100;
  }

  /**
   * Validates a requested channel string against the known OrderChannel enum values,
   * to safely interpolate it into raw SQL (parameterized $N placeholders don't work
   * cleanly with dynamically-built GROUP BY/WHERE clauses in $queryRawUnsafe, so we
   * allowlist-validate instead of blindly interpolating user input).
   */
  private validateChannel(channel?: string): string | undefined {
    if (!channel) return undefined;
    const allowed = [
      'pos',
      'qr',
      'delivery_zomato',
      'delivery_swiggy',
      'delivery_ubereats',
      'whatsapp',
      'phone',
    ];
    if (!allowed.includes(channel)) {
      throw new BadRequestException(`Invalid channel: ${channel}`);
    }
    return channel;
  }

  async getSalesSummary(
    query: SalesSummaryQueryDto,
  ): Promise<SalesSummaryResult> {
    const { start, end } = this.validateDateRange(
      query.startDate,
      query.endDate,
    );
    const branchIds = this.resolveAccessibleBranchIds(query.branchIds);
    const trunc = PERIOD_TO_TRUNC[query.period];
    const channel = this.validateChannel(query.channel);

    const groupByBranch = query.groupByBranch ?? false;
    const groupByChannel = query.groupByChannel ?? false;

    const result = await this.prisma.forCurrentTenant(async (tx) => {
      return tx.$queryRawUnsafe<RawSalesRow[]>(
        `
        SELECT
          date_trunc('${trunc}', o."created_at") AS period_start,
          ${groupByBranch ? 'o."branch_id"' : 'NULL'} AS branch_id,
          ${groupByBranch ? 'b."name"' : 'NULL'} AS branch_name,
          ${groupByChannel ? 'o."channel"::text' : 'NULL'} AS channel,
          COUNT(*)::bigint AS order_count,
          SUM(o."subtotal")::text AS subtotal,
          SUM(o."tax_amount")::text AS tax_amount,
          SUM(o."total")::text AS total
        FROM "orders" o
        ${groupByBranch ? 'LEFT JOIN "branches" b ON b."id" = o."branch_id"' : ''}
        WHERE o."created_at" >= $1
          AND o."created_at" < $2
          AND o."status" = '${SALES_STATUS}'
          ${branchIds ? 'AND o."branch_id" = ANY($3::text[])' : ''}
          ${channel ? `AND o."channel" = '${channel}'` : ''}
        GROUP BY 1${groupByBranch ? ', 2, 3' : ''}${groupByChannel ? ', 4' : ''}
        ORDER BY 1 ASC
        `,
        start,
        end,
        ...(branchIds ? [branchIds] : []),
      );
    });

    const points: SalesSummaryPoint[] = result.map((row) => {
      const orderCount = Number(row.order_count);
      const totalAmount = this.toNumber(row.total);
      return {
        periodStart: row.period_start.toISOString(),
        branchId: row.branch_id,
        branchName: row.branch_name,
        channel: row.channel,
        orderCount,
        subtotal: this.toNumber(row.subtotal),
        taxAmount: this.toNumber(row.tax_amount),
        discountAmount: 0, // orders table has no discount column in current schema
        totalAmount,
        averageOrderValue:
          orderCount > 0
            ? Math.round((totalAmount / orderCount) * 100) / 100
            : 0,
      };
    });

    const grandTotal = points.reduce(
      (acc, p) => {
        acc.orderCount += p.orderCount;
        acc.subtotal += p.subtotal;
        acc.taxAmount += p.taxAmount;
        acc.totalAmount += p.totalAmount;
        return acc;
      },
      { orderCount: 0, subtotal: 0, taxAmount: 0, totalAmount: 0 },
    );

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      period: query.period,
      points,
      grandTotal: {
        ...grandTotal,
        discountAmount: 0,
        averageOrderValue:
          grandTotal.orderCount > 0
            ? Math.round(
                (grandTotal.totalAmount / grandTotal.orderCount) * 100,
              ) / 100
            : 0,
      },
    };
  }

  async getBestSellers(query: BestSellersQueryDto): Promise<BestSellerItem[]> {
    const { start, end } = this.validateDateRange(
      query.startDate,
      query.endDate,
    );
    const branchIds = this.resolveAccessibleBranchIds(query.branchIds);
    const limit = query.limit ?? 10;
    const groupByBranch = query.groupByBranch ?? false;
    const orderColumn =
      query.sortBy === BestSellerSortBy.REVENUE ? 'revenue' : 'quantity_sold';

    const rows = await this.prisma.forCurrentTenant(async (tx) => {
      return tx.$queryRawUnsafe<RawBestSellerRow[]>(
        `
        SELECT
          oi."product_id" AS product_id,
          MAX(mi."name") AS item_name,
          ${groupByBranch ? 'o."branch_id"' : 'NULL'} AS branch_id,
          ${groupByBranch ? 'b."name"' : 'NULL'} AS branch_name,
          SUM(oi."quantity")::bigint AS quantity_sold,
          SUM(oi."quantity" * oi."unit_price")::text AS revenue,
          COUNT(DISTINCT o."id")::bigint AS order_count
        FROM "order_items" oi
        INNER JOIN "orders" o ON o."id" = oi."order_id"
        LEFT JOIN "menu_items" mi ON mi."id" = oi."product_id"
        ${groupByBranch ? 'LEFT JOIN "branches" b ON b."id" = o."branch_id"' : ''}
        WHERE o."created_at" >= $1
          AND o."created_at" < $2
          AND o."status" = '${SALES_STATUS}'
          ${branchIds ? 'AND o."branch_id" = ANY($3::text[])' : ''}
        GROUP BY oi."product_id"${groupByBranch ? ', o."branch_id", b."name"' : ''}
        ORDER BY ${orderColumn} DESC
        LIMIT ${limit}
        `,
        start,
        end,
        ...(branchIds ? [branchIds] : []),
      );
    });

    return rows.map((row) => ({
      menuItemId: row.product_id,
      itemName: row.item_name ?? 'Unknown / Combo Item',
      branchId: row.branch_id,
      branchName: row.branch_name,
      quantitySold: Number(row.quantity_sold),
      revenue: this.toNumber(row.revenue),
      orderCount: Number(row.order_count),
    }));
  }

  async getBranchRollup(
    query: BranchRollupQueryDto,
  ): Promise<BranchRollupResult> {
    const { start, end } = this.validateDateRange(
      query.startDate,
      query.endDate,
    );
    const branchIds = this.resolveAccessibleBranchIds(query.branchIds);

    const rows = await this.prisma.forCurrentTenant(async (tx) => {
      return tx.$queryRawUnsafe<RawRollupRow[]>(
        `
        SELECT
          o."branch_id" AS branch_id,
          b."name" AS branch_name,
          COUNT(*)::bigint AS order_count,
          SUM(o."subtotal")::text AS subtotal,
          SUM(o."tax_amount")::text AS tax_amount,
          SUM(o."total")::text AS total
        FROM "orders" o
        INNER JOIN "branches" b ON b."id" = o."branch_id"
        WHERE o."created_at" >= $1
          AND o."created_at" < $2
          AND o."status" = '${SALES_STATUS}'
          ${branchIds ? 'AND o."branch_id" = ANY($3::text[])' : ''}
        GROUP BY o."branch_id", b."name"
        ORDER BY total DESC NULLS LAST
        `,
        start,
        end,
        ...(branchIds ? [branchIds] : []),
      );
    });

    const branches: BranchRollupBreakdown[] = rows.map((row) => {
      const orderCount = Number(row.order_count);
      const totalAmount = this.toNumber(row.total);
      return {
        branchId: row.branch_id,
        branchName: row.branch_name,
        orderCount,
        subtotal: this.toNumber(row.subtotal),
        taxAmount: this.toNumber(row.tax_amount),
        discountAmount: 0,
        totalAmount,
        averageOrderValue:
          orderCount > 0
            ? Math.round((totalAmount / orderCount) * 100) / 100
            : 0,
      };
    });

    const combined = branches.reduce(
      (acc, b) => {
        acc.orderCount += b.orderCount;
        acc.subtotal += b.subtotal;
        acc.taxAmount += b.taxAmount;
        acc.totalAmount += b.totalAmount;
        return acc;
      },
      { orderCount: 0, subtotal: 0, taxAmount: 0, totalAmount: 0 },
    );

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      combined: {
        ...combined,
        discountAmount: 0,
        averageOrderValue:
          combined.orderCount > 0
            ? Math.round((combined.totalAmount / combined.orderCount) * 100) /
              100
            : 0,
      },
      branches,
    };
  }
}
