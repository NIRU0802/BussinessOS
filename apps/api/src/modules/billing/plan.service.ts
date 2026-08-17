import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

/**
 * Plans, plan_limits, plan_widgets, and addons are PLATFORM-LEVEL
 * (no tenant_id) — they are not tenant-scoped, so this service uses
 * the global `this.prisma` client directly, NOT
 * PrismaService.forTenant/forCurrentTenant.
 */
@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        price: dto.price,
        billingCycle: dto.billingCycle,
        description: dto.description,
        providerPlanId: dto.providerPlanId,
        isActive: dto.isActive ?? true,
        limits: dto.limits
          ? {
              create: {
                maxBranches: dto.limits.maxBranches,
                maxUsers: dto.limits.maxUsers,
                maxDevices: dto.limits.maxDevices,
                maxStorageMb: dto.limits.maxStorageMb,
                maxMonthlyOrders: dto.limits.maxMonthlyOrders,
              },
            }
          : undefined,
        widgets: dto.widgetKeys
          ? { create: dto.widgetKeys.map((widgetKey) => ({ widgetKey })) }
          : undefined,
      },
      include: { limits: true, widgets: true },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { limits: true, widgets: true },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { limits: true, widgets: true },
    });
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.limits) {
        await tx.planLimit.upsert({
          where: { planId: id },
          create: { planId: id, ...dto.limits },
          update: { ...dto.limits },
        });
      }

      if (dto.widgetKeys) {
        await tx.planWidget.deleteMany({ where: { planId: id } });
        await tx.planWidget.createMany({
          data: dto.widgetKeys.map((widgetKey) => ({ planId: id, widgetKey })),
        });
      }

      return tx.plan.update({
        where: { id },
        data: {
          name: dto.name,
          price: dto.price,
          billingCycle: dto.billingCycle,
          description: dto.description,
          providerPlanId: dto.providerPlanId,
          isActive: dto.isActive,
        },
        include: { limits: true, widgets: true },
      });
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
