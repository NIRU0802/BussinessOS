import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationContent,
  NotificationPreparedPayload,
  NotificationProvider,
  NotificationSendResult,
} from '../interfaces/notification-provider.interface';

@Injectable()
export class TwilioWhatsappProvider implements NotificationProvider {
  channel: 'whatsapp' = 'whatsapp';
  private readonly logger = new Logger(TwilioWhatsappProvider.name);
  private client: any;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (accountSid && authToken) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const twilio = require('twilio');
      this.client = twilio(accountSid, authToken);
    }
  }

  async send(
    recipient: string,
    content: NotificationContent,
  ): Promise<NotificationSendResult> {
    if (!this.client) {
      return { success: false, errorMessage: 'Twilio not configured' };
    }
    try {
      const result = await this.client.messages.create({
        body: content.body,
        from: `whatsapp:${this.config.get<string>('TWILIO_WHATSAPP_FROM')}`,
        to: `whatsapp:${recipient}`,
      });
      return { success: true, providerRef: result.sid, rawResponse: result };
    } catch (err: any) {
      this.logger.error(`Twilio WhatsApp send failed: ${err.message}`);
      return { success: false, errorMessage: err.message };
    }
  }

  /**
   * "Prepare only" mode: builds a free wa.me deep link with pre-filled text.
   * No Twilio/WhatsApp Business API cost — a human taps send themselves.
   */
  prepare(
    recipient: string,
    content: NotificationContent,
  ): NotificationPreparedPayload {
    const digitsOnly = recipient.replace(/[^\d]/g, '');
    const encodedText = encodeURIComponent(content.body);
    return {
      channel: 'whatsapp',
      recipient,
      renderedBody: content.body,
      deepLink: `https://wa.me/${digitsOnly}?text=${encodedText}`,
    };
  }
}
