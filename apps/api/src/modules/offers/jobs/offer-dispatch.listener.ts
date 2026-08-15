import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { SendNotificationDto } from '../../notification/dto/send-notification.dto';
import { OFFER_EVENTS } from '../events/offer.events';
import type { OfferDispatchReadyEvent } from '../events/offer.events';

/**
 * Listens for offer.dispatch_ready and notifies branch managers, mirroring
 * BirthdayReminderListener's pattern. Staff-facing alert only — never sent
 * to the customer, so triggerType is 'generic' and consentGated is false.
 */
@Injectable()
export class OfferDispatchListener {
  private readonly logger = new Logger(OfferDispatchListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(OFFER_EVENTS.DISPATCH_READY)
  async handleDispatchReady(payload: OfferDispatchReadyEvent) {
    try {
      const managers = await this.prisma.user.findMany({
        where: {
          tenantId: payload.tenantId,
          isActive: true,
          roles: { some: { role: { name: 'MANAGER' } } },
        },
        select: { id: true, email: true },
      });

      if (managers.length === 0) {
        this.logger.warn(
          `No managers found for tenant ${payload.tenantId} to notify of offer "${payload.offerTitle}"`,
        );
        return;
      }

      for (const manager of managers) {
        if (!manager.email) continue;

        const dto: SendNotificationDto = {
          channel: 'email',
          triggerType: 'generic',
          mode: 'auto_send',
          consentGated: false,
          recipient: manager.email,
          templateKey: 'offer_dispatch_ready',
          subject: `Offer ready: ${payload.offerTitle}`,
          body: `Offer "${payload.offerTitle}" is ready to send to ${payload.customerName}. Review and share via WhatsApp from the customer's profile.`,
          variables: {
            offerId: payload.offerId,
            offerTitle: payload.offerTitle,
            customerId: payload.customerId,
            customerName: payload.customerName,
          },
        };

        await this.notificationService.send(payload.tenantId, dto);
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify managers for offer dispatch (offer ${payload.offerId}, customer ${payload.customerId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
