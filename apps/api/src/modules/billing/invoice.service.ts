import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { generateInvoicePdfBuffer } from './invoice-pdf.util';
import { BILLING_EVENTS } from './events/billing.events';
import { MinioService } from '../../common/storage/minio.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly minioService: MinioService,
  ) {}

  async generateAndStorePdf(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true, subscription: { include: { plan: true } } },
      }),
    );
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);

    const pdfBuffer = await generateInvoicePdfBuffer({
      invoiceId: invoice.id,
      tenantName: tenantId, // ADJUST: resolve real tenant display name via a TenantService if one exists
      planName: invoice.subscription.plan.name,
      amount: Number(invoice.amount),
      currency: 'INR', // ADJUST: pull from tenant's currency engine settings
      issuedAt: invoice.issuedAt,
      items: invoice.items.map((i) => ({
        description: i.description,
        amount: Number(i.amount),
      })),
    });

    const { objectKey } = await this.minioService.uploadFile({
      tenantId,
      namespace: 'invoices',
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      originalFilename: `invoice-${invoice.id}.pdf`,
    });

    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.update({
        where: { id: invoiceId },
        data: { pdfObjectKey: objectKey, status: 'issued' },
      }),
    );

    this.eventEmitter.emit(BILLING_EVENTS.INVOICE_ISSUED, {
      tenantId,
      invoiceId,
    });
    return updated;
  }

  async getSignedPdfUrl(tenantId: string, invoiceId: string): Promise<string> {
    const invoice = await this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.findUnique({ where: { id: invoiceId } }),
    );
    if (!invoice?.pdfObjectKey) {
      throw new NotFoundException('Invoice PDF not yet generated.');
    }
    const url = await this.minioService.getSignedReadUrl(invoice.pdfObjectKey);
    if (!url) throw new NotFoundException('Could not resolve signed URL.');
    return url;
  }

  async createInvoiceForCycle(
    tenantId: string,
    subscriptionId: string,
    amount: number,
    description: string,
  ) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.create({
        data: {
          tenantId,
          subscriptionId,
          amount,
          status: 'draft',
          issuedAt: new Date(),
          items: { create: [{ description, amount }] },
        },
      }),
    );
  }

  async markPaid(tenantId: string, invoiceId: string) {
    const updated = await this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'paid', paidAt: new Date() },
      }),
    );
    this.eventEmitter.emit(BILLING_EVENTS.INVOICE_PAID, {
      tenantId,
      invoiceId,
    });
    return updated;
  }

  async markFailed(tenantId: string, invoiceId: string) {
    return this.prisma.forTenant(tenantId, (tx) =>
      tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'failed' },
      }),
    );
  }
}
