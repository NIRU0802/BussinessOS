import { Prisma, PrismaClient } from '@prisma/client';
import { OfferSegment } from '@prisma/client';

/**
 * Resolves an OfferSegment enum into a concrete list of customer IDs for
 * a given tenant, using the tenant-scoped transaction client passed in
 * (never a raw cross-tenant query — respects RLS/tenant isolation).
 */
export async function resolveSegmentCustomerIds(
  tx: Prisma.TransactionClient | PrismaClient,
  tenantId: string,
  segment: OfferSegment,
): Promise<string[]> {
  switch (segment) {
    case 'ALL_CUSTOMERS': {
      const customers = await tx.customer.findMany({
        where: { tenantId },
        select: { id: true },
      });
      return customers.map((c) => c.id);
    }

    case 'BIRTHDAY_THIS_WEEK': {
      const now = new Date();
      const in7 = new Date(now);
      in7.setDate(now.getDate() + 7);
      const customers = await tx.customer.findMany({
        where: { tenantId, dob: { not: null } },
        select: { id: true, dob: true },
      });
      return customers
        .filter((c) => {
          if (!c.dob) return false;
          const d = new Date(c.dob);
          return withinNextNDays(d, now, 7);
        })
        .map((c) => c.id);
    }

    case 'INACTIVE_30_DAYS':
    case 'INACTIVE_60_DAYS': {
      const days = segment === 'INACTIVE_30_DAYS' ? 30 : 60;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const customers = await tx.customer.findMany({
        where: {
          tenantId,
          OR: [{ lastOrderAt: { lt: cutoff } }, { lastOrderAt: null }],
        },
        select: { id: true },
      });
      return customers.map((c) => c.id);
    }

    case 'TOP_SPENDERS': {
      const customers = await tx.customer.findMany({
        where: { tenantId, totalSpent: { gt: 0 } },
        orderBy: { totalSpent: 'desc' },
        take: 100,
        select: { id: true },
      });
      return customers.map((c) => c.id);
    }

    case 'NEW_CUSTOMERS': {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const customers = await tx.customer.findMany({
        where: { tenantId, createdAt: { gte: cutoff } },
        select: { id: true },
      });
      return customers.map((c) => c.id);
    }

    default:
      return [];
  }
}

function withinNextNDays(target: Date, from: Date, n: number): boolean {
  const targetThisYear = new Date(
    from.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  if (targetThisYear < stripTime(from)) {
    targetThisYear.setFullYear(from.getFullYear() + 1);
  }
  const diffDays = Math.round(
    (targetThisYear.getTime() - stripTime(from).getTime()) / 86_400_000,
  );
  return diffDays >= 0 && diffDays <= n;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
