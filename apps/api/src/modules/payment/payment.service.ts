import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentProvider } from './interfaces/payment-provider.interface';
import { CashProvider } from './providers/cash.provider';
import { CardProvider } from './providers/card.provider';
import { UpiProvider } from './providers/upi.provider';

@Injectable()
export class PaymentService {
  private providers: Record<string, PaymentProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cashProvider: CashProvider,
    private readonly cardProvider: CardProvider,
    private readonly upiProvider: UpiProvider,
  ) {
    this.providers = {
      cash: this.cashProvider,
      card: this.cardProvider,
      upi: this.upiProvider,
    };
  }

  async recordPayment(tenantId: string, userId: string, dto: RecordPaymentDto) {
    const provider = this.providers[dto.method];
    if (!provider) {
      throw new BadRequestException(
        `Unsupported/not-yet-configured payment method: ${dto.method}`,
      );
    }

    const result = await provider.charge(
      dto.amount,
      dto.currency ?? 'INR',
      dto.metadata,
    );

    return this.prisma.paymentRecord.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        orderId: dto.orderId,
        method: dto.method,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        status: result.success ? 'success' : 'failed',
        providerRef: result.providerRef ?? null,
        metadata: (result.metadata as any) ?? {},
        recordedByUserId: userId,
      },
    });
  }

  async getOrderPayments(
    tenantId: string,
    orderId: string,
    orderTotal?: number,
  ) {
    const records = await this.prisma.paymentRecord.findMany({
      where: { tenantId, orderId },
      include: { refunds: true },
    });
    const totalPaid = records
      .filter((r) => r.status === 'success')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      records,
      totalPaid,
      fullyPaid: orderTotal !== undefined ? totalPaid >= orderTotal : undefined,
    };
  }

  async refundPayment(
    tenantId: string,
    approvedByUserId: string,
    dto: RefundPaymentDto,
  ) {
    const record = await this.prisma.paymentRecord.findFirst({
      where: { id: dto.paymentRecordId, tenantId },
      include: { refunds: true },
    });
    if (!record) throw new NotFoundException('Payment record not found');

    const alreadyRefunded = record.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    if (alreadyRefunded + dto.amount > Number(record.amount)) {
      throw new BadRequestException(
        'Refund amount exceeds remaining refundable balance',
      );
    }

    const provider = this.providers[record.method];
    const result = await provider.refund(
      record.providerRef ?? undefined,
      dto.amount,
    );

    const refund = await this.prisma.paymentRefund.create({
      data: {
        tenantId,
        paymentRecordId: record.id,
        amount: dto.amount,
        reason: dto.reason,
        approvedByUserId,
        status: result.success ? 'completed' : 'failed',
      },
    });

    const newTotal = alreadyRefunded + dto.amount;
    await this.prisma.paymentRecord.update({
      where: { id: record.id },
      data: {
        status:
          newTotal >= Number(record.amount) ? 'refunded' : 'partially_refunded',
      },
    });

    return refund;
  }
}
