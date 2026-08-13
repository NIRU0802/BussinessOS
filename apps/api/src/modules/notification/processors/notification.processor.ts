import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotificationService,
  NOTIFICATION_QUEUE,
} from '../notification.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { logId, dto } = job.data;
    const provider = this.notificationService.getProvider(dto.channel);

    const result = await provider.send(dto.recipient, {
      subject: dto.subject,
      body: dto.body,
      templateKey: dto.templateKey,
      variables: dto.variables,
    });

    if (result.success) {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: 'sent',
          providerResponse: (result.rawResponse as any) ?? {},
        },
      });
    } else {
      const log = await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: 'failed',
          errorMessage: result.errorMessage,
          retryCount: { increment: 1 },
        },
      });
      this.logger.warn(
        `Notification ${logId} failed (attempt ${log.retryCount}): ${result.errorMessage}`,
      );
      // Throwing lets BullMQ apply the exponential backoff retry configured on the job.
      throw new Error(result.errorMessage ?? 'Notification send failed');
    }
  }
}
