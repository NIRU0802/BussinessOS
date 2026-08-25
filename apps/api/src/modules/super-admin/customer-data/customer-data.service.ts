import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuperAdminAuditService } from '../common/super-admin-audit.service';
import { CustomerListQueryDto } from './dto/customer-list-query.dto';
import type { AuditContext } from '../tenant-management/tenant-management.service';

@Injectable()
export class CustomerDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: SuperAdminAuditService,
  ) {}

  async listCustomers(query: CustomerListQueryDto, ctx: AuditContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 && query.pageSize <= 100
        ? query.pageSize
        : 25;

    const where: any = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // businessType filter is applied post-Phase-B via a nested tenant relation filter.
    // Left as a no-op placeholder until the Tenant.businessType field exists.
    if (query.businessType) {
      where.tenant = { businessType: query.businessType };
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          email: true,
          dob: true,
          totalOrders: true,
          totalSpent: true,
          lastOrderAt: true,
          createdAt: true,
          tenant: {
            select: { name: true, slug: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    await this.auditService.record({
      superAdminId: ctx.superAdminId,
      adminTypeAtTime: ctx.adminType,
      targetTenantId: query.tenantId ?? null,
      action: 'customer_data.list',
      resourceType: 'customer',
      metadata: {
        search: query.search ?? null,
        tenantId: query.tenantId ?? null,
        businessType: query.businessType ?? null,
        page,
        pageSize,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        dob: c.dob,
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        lastOrderAt: c.lastOrderAt,
        createdAt: c.createdAt,
        businessName: c.tenant.name,
        businessSlug: c.tenant.slug,
        tenantId: c.tenantId,
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
