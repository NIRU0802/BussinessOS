import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context/tenant-context.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { resolveSegmentCustomerIds } from './offer-segments.util';
import { OFFER_EVENTS, OfferDispatchReadyEvent } from './events/offer.events';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  create(dto: CreateOfferDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    return this.prisma.forCurrentTenant((tx) =>
      tx.offer.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          title: dto.title,
          messageTemplate: dto.messageTemplate,
          triggerType: dto.triggerType,
          segment: dto.segment ?? 'ALL_CUSTOMERS',
          scheduledFor: dto.scheduledFor
            ? new Date(dto.scheduledFor)
            : undefined,
          recurringMonth: dto.recurringMonth,
          recurringDay: dto.recurringDay,
          inactivityDays: dto.inactivityDays,
          isActive: dto.isActive ?? true,
          createdByUserId: userId,
        },
      }),
    );
  }

  findAll() {
    return this.prisma.forCurrentTenant((tx) =>
      tx.offer.findMany({ orderBy: { createdAt: 'desc' } }),
    );
  }

  async findOne(id: string) {
    const offer = await this.prisma.forCurrentTenant((tx) =>
      tx.offer.findUnique({ where: { id } }),
    );
    if (!offer) throw new NotFoundException(`Offer ${id} not found`);
    return offer;
  }

  async update(id: string, dto: UpdateOfferDto) {
    await this.findOne(id);
    return this.prisma.forCurrentTenant((tx) =>
      tx.offer.update({
        where: { id },
        data: {
          title: dto.title,
          messageTemplate: dto.messageTemplate,
          triggerType: dto.triggerType,
          segment: dto.segment,
          branchId: dto.branchId,
          scheduledFor: dto.scheduledFor
            ? new Date(dto.scheduledFor)
            : undefined,
          recurringMonth: dto.recurringMonth,
          recurringDay: dto.recurringDay,
          inactivityDays: dto.inactivityDays,
          isActive: dto.isActive,
        },
      }),
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.forCurrentTenant((tx) =>
      tx.offer.delete({ where: { id } }),
    );
  }

  /**
   * Manually fires an offer immediately: resolves its target segment,
   * dedupes against dispatches already created today, and emits one
   * OFFER_EVENTS.DISPATCH_READY event per matched customer. Used both for
   * MANUAL trigger offers (button in the UI) and internally by the daily
   * scan job for SCHEDULED/RECURRING_DATE/INACTIVITY offers.
   */
  async triggerNow(offerId: string) {
    const tenantId = this.tenantContext.getTenantId();

    return this.prisma.forCurrentTenant(async (tx) => {
      const offer = await tx.offer.findUnique({ where: { id: offerId } });
      if (!offer) throw new NotFoundException(`Offer ${offerId} not found`);
      if (!offer.isActive) {
        throw new NotFoundException(`Offer ${offerId} is not active`);
      }

      const customerIds = await resolveSegmentCustomerIds(
        tx,
        tenantId,
        offer.segment,
      );

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const alreadyDispatchedToday = await tx.offerDispatch.findMany({
        where: {
          offerId,
          createdAt: { gte: startOfToday },
          customerId: { in: customerIds },
        },
        select: { customerId: true },
      });
      const alreadyDispatchedSet = new Set(
        alreadyDispatchedToday.map((d) => d.customerId),
      );

      const targetIds = customerIds.filter(
        (id) => !alreadyDispatchedSet.has(id),
      );
      if (targetIds.length === 0) {
        return { offerId, matched: 0 };
      }

      const customers = await tx.customer.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, name: true, phone: true },
      });

      await tx.offerDispatch.createMany({
        data: customers.map((c) => ({
          tenantId,
          offerId,
          customerId: c.id,
        })),
      });

      for (const customer of customers) {
        const messagePreview = renderTemplate(offer.messageTemplate, {
          customerName: customer.name,
          offerTitle: offer.title,
        });

        this.eventEmitter.emit(OFFER_EVENTS.DISPATCH_READY, {
          tenantId,
          offerId: offer.id,
          offerTitle: offer.title,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          messagePreview,
        } satisfies OfferDispatchReadyEvent);
      }

      return { offerId, matched: customers.length };
    });
  }
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? '',
  );
}
