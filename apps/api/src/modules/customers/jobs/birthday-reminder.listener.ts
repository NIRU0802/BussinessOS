import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { SendNotificationDto } from '../../notification/dto/send-notification.dto';
import { CUSTOMER_EVENTS } from '../events/customer.events';
import type { CustomerBirthdayUpcomingEvent } from '../events/customer.events';

/**
 * Listens for customer.birthday_upcoming events (emitted by the daily
 * scan job) and routes an in-app/email notification to branch managers
 * via the Multi-Channel Notification Engine (Phase 2). This is an
 * internal staff alert only — never a customer-facing send, so
 * triggerType is 'generic' and consentGated is false regardless of the
 * customer's own marketing consent.
 */
@Injectable()
export class BirthdayReminderListener {
  private readonly logger = new Logger(BirthdayReminderListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(CUSTOMER_EVENTS.BIRTHDAY_UPCOMING)
  async handleBirthdayUpcoming(payload: CustomerBirthdayUpcomingEvent) {
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
          `No managers found for tenant ${payload.tenantId} to notify of upcoming birthday`,
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
          templateKey: 'customer_birthday_upcoming',
          subject: `Upcoming birthday: ${payload.customerName}`,
          body: `${payload.customerName} has a birthday in ${payload.daysUntilBirthday} days (${payload.birthdayDate}). Open their profile to prepare a WhatsApp greeting to send manually.`,
          variables: {
            customerId: payload.customerId,
            customerName: payload.customerName,
            daysUntilBirthday: payload.daysUntilBirthday,
            birthdayDate: payload.birthdayDate,
          },
        };

        await this.notificationService.send(payload.tenantId, dto);
      }

      this.logger.log(
        `Notified ${managers.length} manager(s) for upcoming birthday: customer ${payload.customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify managers of upcoming birthday for customer ${payload.customerId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
