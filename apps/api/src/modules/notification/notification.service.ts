import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { TwilioWhatsappProvider } from './providers/twilio-whatsapp.provider';
import { SendgridEmailProvider } from './providers/sendgrid-email.provider';
import { NotificationProvider } from './interfaces/notification-provider.interface';

export const NOTIFICATION_QUEUE = 'notification-queue';

@Injectable()
export class NotificationService {
  private providers: Record<string, NotificationProvider>;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue,
    private readonly smsProvider: TwilioSmsProvider,
    private readonly whatsappProvider: TwilioWhatsappProvider,
    private readonly emailProvider: SendgridEmailProvider,
  ) {
    this.providers = {
      sms: this.smsProvider,
      whatsapp: this.whatsappProvider,
      email: this.emailProvider,
    };
  }

  async send(tenantId: string, dto: SendNotificationDto) {
    const effectiveConsentGated =
      dto.triggerType === 'security_alert' ? false : dto.consentGated;

    if (effectiveConsentGated && !dto.recipientHasMarketingConsent) {
      const skipped = await this.prisma.notificationLog.create({
        data: {
          tenantId,
          branchId: dto.branchId ?? null,
          channel: dto.channel,
          triggerType: dto.triggerType,
          mode: dto.mode,
          consentGated: true,
          recipient: dto.recipient,
          templateKey: dto.templateKey ?? null,
          payload: {
            subject: dto.subject,
            body: dto.body,
            variables: dto.variables,
          },
          status: 'skipped_no_consent',
        },
      });
      return { log: skipped, dispatched: false };
    }

    const provider = this.providers[dto.channel];
    if (!provider) {
      throw new BadRequestException(`Unsupported channel: ${dto.channel}`);
    }

    if (dto.mode === 'prepare_only') {
      const prepared = provider.prepare(dto.recipient, {
        subject: dto.subject,
        body: dto.body,
        templateKey: dto.templateKey,
        variables: dto.variables,
      });
      const log = await this.prisma.notificationLog.create({
        data: {
          tenantId,
          branchId: dto.branchId ?? null,
          channel: dto.channel,
          triggerType: dto.triggerType,
          mode: 'prepare_only',
          consentGated: effectiveConsentGated,
          recipient: dto.recipient,
          templateKey: dto.templateKey ?? null,
          payload: prepared as any,
          status: 'prepared',
        },
      });
      return { log, dispatched: false, prepared };
    }

    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        branchId: dto.branchId ?? null,
        channel: dto.channel,
        triggerType: dto.triggerType,
        mode: 'auto_send',
        consentGated: effectiveConsentGated,
        recipient: dto.recipient,
        templateKey: dto.templateKey ?? null,
        payload: {
          subject: dto.subject,
          body: dto.body,
          variables: dto.variables,
        },
        status: 'queued',
      },
    });

    await this.queue.add(
      'send-notification',
      { logId: log.id, tenantId, dto },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { log, dispatched: true };
  }

  getProvider(channel: 'sms' | 'email' | 'whatsapp'): NotificationProvider {
    return this.providers[channel];
  }
}
