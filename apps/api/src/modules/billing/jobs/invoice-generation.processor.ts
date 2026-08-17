import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InvoiceService } from '../invoice.service';

export interface InvoiceGenerationJobData {
  tenantId: string;
  invoiceId: string;
}

@Processor('billing-invoice-generation')
export class InvoiceGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceGenerationProcessor.name);

  constructor(private readonly invoiceService: InvoiceService) {
    super();
  }

  async process(job: Job<InvoiceGenerationJobData>): Promise<void> {
    const { tenantId, invoiceId } = job.data;
    this.logger.log(
      `Generating PDF for invoice ${invoiceId} (tenant ${tenantId})`,
    );
    await this.invoiceService.generateAndStorePdf(tenantId, invoiceId);
  }
}
