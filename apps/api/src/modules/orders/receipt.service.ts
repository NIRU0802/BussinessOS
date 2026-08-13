import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SendNotificationDto } from '../notification/dto/send-notification.dto';

interface RequestUser {
  id: string;
  tenantId: string;
  permissions: string[];
}

interface ReceiptData {
  orderId: string;
  branchId: string;
  channel: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    modifiers: unknown;
  }>;
  subtotal: string;
  taxAmount: string;
  total: string;
  payments: Array<{ method: string; amount: string; status: string }>;
  createdAt: Date;
}

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getReceiptData(
    user: RequestUser,
    orderId: string,
  ): Promise<ReceiptData> {
    const order = await this.prisma.forTenant(user.tenantId, (tx) =>
      tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payments: true },
      }),
    );
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return {
      orderId: order.id,
      branchId: order.branchId,
      channel: order.channel,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.unitPrice.mul(item.quantity).toString(),
        modifiers: item.modifiers,
      })),
      subtotal: order.subtotal.toString(),
      taxAmount: order.taxAmount.toString(),
      total: order.total.toString(),
      payments: order.payments.map((p) => ({
        method: p.method,
        amount: p.amount.toString(),
        status: p.status,
      })),
      createdAt: order.createdAt,
    };
  }

  // "Prepare only" — creates a NotificationLog row (status 'prepared') and
  // returns the wa.me deep link WITHOUT dispatching via Twilio. Any staff
  // role may call this; no manager approval needed (unlike void/refund).
  // triggerType is 'transactional' (a receipt is order-related, not
  // marketing) and consentGated is false — the customer explicitly
  // ordered and staff explicitly triggered this, so marketing consent
  // gating doesn't apply here.
  async prepareWhatsAppReceipt(
    user: RequestUser,
    orderId: string,
    customerPhone: string,
  ) {
    const receipt = await this.getReceiptData(user, orderId);

    const lines = [
      `Receipt — Order ${receipt.orderId.slice(0, 8)}`,
      ...receipt.items.map(
        (i) => `${i.quantity} x ${i.productId} — ${i.lineTotal}`,
      ),
      `Subtotal: ${receipt.subtotal}`,
      `Tax: ${receipt.taxAmount}`,
      `Total: ${receipt.total}`,
      `Thank you for your order!`,
    ];
    const body = lines.join('\n');

    const dto: SendNotificationDto = {
      channel: 'whatsapp',
      triggerType: 'transactional',
      mode: 'prepare_only',
      consentGated: false,
      recipient: customerPhone,
      branchId: receipt.branchId,
      body,
      variables: { orderId: receipt.orderId },
    };

    const result = await this.notificationService.send(user.tenantId, dto);

    return {
      orderId,
      logId: result.log.id,
      prepared: result.prepared,
    };
  }
}
