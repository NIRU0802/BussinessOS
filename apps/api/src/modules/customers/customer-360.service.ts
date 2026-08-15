import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface Customer360Response {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    dob: Date | null;
    notes: string | null;
    preferences: unknown;
    createdAt: Date;
  };
  addresses: Array<{
    id: string;
    label: string;
    line1: string;
    line2: string | null;
    city: string;
    isDefault: boolean;
  }>;
  orderStats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    firstOrderAt: Date | null;
    lastOrderAt: Date | null;
  };
  channelBreakdown: Array<{ channel: string; orderCount: number }>;
  branchBreakdown: Array<{ branchId: string; orderCount: number }>;
  recentOrders: Array<{
    id: string;
    branchId: string;
    channel: string;
    status: string;
    total: number;
    createdAt: Date;
  }>;
}

/**
 * Aggregates a 360-degree view of a customer for a tenant: profile,
 * addresses, and order-history statistics pulled from Orders (Phase 4)
 * via the shared, tenant-scoped Prisma client. Read-only — never mutates
 * Order data, respecting strict module boundaries.
 */
@Injectable()
export class Customer360Service {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomer360(customerId: string): Promise<Customer360Response> {
    return this.prisma.forCurrentTenant(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { addresses: true },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${customerId} not found`);
      }

      const orders = await tx.order.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          branchId: true,
          channel: true,
          status: true,
          total: true,
          createdAt: true,
        },
      });

      const totalOrders = orders.length;
      const totalSpent = orders.reduce(
        (sum, o) => sum + Number(o.total ?? 0),
        0,
      );
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const firstOrderAt =
        totalOrders > 0 ? orders[orders.length - 1].createdAt : null;
      const lastOrderAt = totalOrders > 0 ? orders[0].createdAt : null;

      const channelMap = new Map<string, number>();
      const branchMap = new Map<string, number>();

      for (const order of orders) {
        channelMap.set(order.channel, (channelMap.get(order.channel) ?? 0) + 1);
        branchMap.set(order.branchId, (branchMap.get(order.branchId) ?? 0) + 1);
      }

      return {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          dob: customer.dob,
          notes: customer.notes,
          preferences: customer.preferences,
          createdAt: customer.createdAt,
        },
        addresses: customer.addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          isDefault: a.isDefault,
        })),
        orderStats: {
          totalOrders,
          totalSpent,
          averageOrderValue,
          firstOrderAt,
          lastOrderAt,
        },
        channelBreakdown: Array.from(channelMap.entries()).map(
          ([channel, orderCount]) => ({
            channel,
            orderCount,
          }),
        ),
        branchBreakdown: Array.from(branchMap.entries()).map(
          ([branchId, orderCount]) => ({
            branchId,
            orderCount,
          }),
        ),
        recentOrders: orders.slice(0, 20).map((o) => ({
          id: o.id,
          branchId: o.branchId,
          channel: o.channel,
          status: o.status,
          total: Number(o.total ?? 0),
          createdAt: o.createdAt,
        })),
      };
    });
  }
}
