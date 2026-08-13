import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationContent,
  NotificationPreparedPayload,
  NotificationProvider,
  NotificationSendResult,
} from '../interfaces/notification-provider.interface';

@Injectable()
export class SendgridEmailProvider implements NotificationProvider {
  channel: 'email' = 'email';
  private readonly logger = new Logger(SendgridEmailProvider.name);
  private sgMail: any;
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.sgMail = require('@sendgrid/mail');
      this.sgMail.setApiKey(apiKey);
      this.configured = true;
    }
  }

  async send(
    recipient: string,
    content: NotificationContent,
  ): Promise<NotificationSendResult> {
    if (!this.configured) {
      return { success: false, errorMessage: 'SendGrid not configured' };
    }
    try {
      const [response] = await this.sgMail.send({
        to: recipient,
        from: this.config.get<string>('SENDGRID_FROM_EMAIL'),
        subject: content.subject ?? 'Notification',
        text: content.body,
      });
      return {
        success: true,
        providerRef: response.headers['x-message-id'],
        rawResponse: { statusCode: response.statusCode },
      };
    } catch (err: any) {
      this.logger.error(`SendGrid send failed: ${err.message}`);
      return { success: false, errorMessage: err.message };
    }
  }

  prepare(
    recipient: string,
    content: NotificationContent,
  ): NotificationPreparedPayload {
    return { channel: 'email', recipient, renderedBody: content.body };
  }
}
