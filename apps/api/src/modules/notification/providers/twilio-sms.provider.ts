import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationContent,
  NotificationPreparedPayload,
  NotificationProvider,
  NotificationSendResult,
} from '../interfaces/notification-provider.interface';

@Injectable()
export class TwilioSmsProvider implements NotificationProvider {
  channel: 'sms' = 'sms';
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private client: any;

  constructor(private readonly config: ConfigService) {
    // Lazy-require so the app still boots if 'twilio' package isn't installed yet in dev
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
        from: this.config.get<string>('TWILIO_SMS_FROM'),
        to: recipient,
      });
      return { success: true, providerRef: result.sid, rawResponse: result };
    } catch (err: any) {
      this.logger.error(`Twilio SMS send failed: ${err.message}`);
      return { success: false, errorMessage: err.message };
    }
  }

  prepare(
    recipient: string,
    content: NotificationContent,
  ): NotificationPreparedPayload {
    return { channel: 'sms', recipient, renderedBody: content.body };
  }
}
