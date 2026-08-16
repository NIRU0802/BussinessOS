import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { KdsGateway } from './kds.gateway';
import { KitchenTicketResponseDto } from './dto/kitchen-ticket-response.dto';
import { KitchenTicketStatus } from './dto/update-ticket-status.dto';
import type { TicketPrinterAdapter } from './interfaces/printer-adapter.interface';
import { Inject } from '@nestjs/common';
import { TICKET_PRINTER_ADAPTER } from './interfaces/printer-adapter.interface';

interface OrderCreatedEventPayload {
  tenantId: string;
  branchId: string;
  orderId: string;
  tableId: string | null;
  channel: string;
  items: Array<{
    orderItemId: string;
    menuItemName: string;
    quantity: number;
    notes: string | null;
  }>;
}

interface OrderItemAddedEventPayload {
  tenantId: string;
  branchId: string;
  orderId: string;
  tableId: string | null;
  channel: string;
  items: Array<{
    orderItemId: string;
    menuItemName: string;
    quantity: number;
    notes: string | null;
  }>;
}

const NEXT_STATUS: Record<KitchenTicketStatus, KitchenTicketStatus | null> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: null,
};

@Injectable()
export class KdsService {
  private readonly logger = new Logger(KdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: KdsGateway,
    private readonly auditLog: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(TICKET_PRINTER_ADAPTER)
    private readonly printerAdapter: TicketPrinterAdapter,
  ) {}

  /**
   * order.created ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Phase 4 emits this once an order (of any channel) is placed.
   * Produces the first kitchen ticket for that order.
   */
  @OnEvent('order.created')
  async handleOrderCreated(payload: OrderCreatedEventPayload): Promise<void> {
    await this.createTicket(payload, { isAddition: false });
  }

  /**
   * order.item_added ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Phase 4 emits this for the "trackable addition" flow when
   * new items are added to an already-open dining session / order. Per spec this
   * must always produce a SEPARATE new ticket, never merge into the original.
   */
  @OnEvent('order.item_added')
  async handleOrderItemAdded(
    payload: OrderItemAddedEventPayload,
  ): Promise<void> {
    await this.createTicket(payload, { isAddition: true });
  }

  /**
   * order.status_changed ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â kept for completeness/future use (e.g. cancellations).
   * KDS does not currently need to react to every status transition on the order
   * itself; ticket status is driven independently by kitchen staff action.
   */
  @OnEvent('order.status_changed')
  handleOrderStatusChanged(payload: { orderId: string; status: string }): void {
    this.logger.debug(
      `order.status_changed observed for order ${payload.orderId}: ${payload.status}`,
    );
  }

  private async createTicket(
    payload: OrderCreatedEventPayload | OrderItemAddedEventPayload,
    opts: { isAddition: boolean },
  ): Promise<void> {
    const { tenantId, branchId, orderId, tableId, channel, items } = payload;

    if (!items?.length) {
      this.logger.warn(
        `Skipping ticket creation for order ${orderId}: no items in payload`,
      );
      return;
    }

    const ticket = await this.prisma.forTenant(tenantId, async (tx) => {
      const sequence =
        (await tx.kitchenTicket.count({ where: { branchId } })) + 1;

      return tx.kitchenTicket.create({
        data: {
          tenantId,
          branchId,
          orderId,
          tableId: tableId ?? null,
          channel,
          ticketSequence: sequence,
          status: 'new',
          isAddition: opts.isAddition,
          items: {
            create: items.map((item) => ({
              tenantId,
              orderItemId: item.orderItemId,
              menuItemName: item.menuItemName,
              quantity: item.quantity,
              notes: item.notes ?? null,
            })),
          },
        },
        include: { items: true },
      });
    });

    const dto = this.toResponseDto(ticket);

    this.gateway.emitTicketCreated(tenantId, branchId, dto);

    await this.maybePrintTicket(tenantId, branchId, dto);
  }

  async updateTicketStatus(
    tenantId: string,
    branchId: string,
    ticketId: string,
    status: KitchenTicketStatus,
    userId: string,
  ): Promise<KitchenTicketResponseDto> {
    const updated = await this.prisma.forTenant(tenantId, async (tx) => {
      const existing = await tx.kitchenTicket.findFirst({
        where: { id: ticketId, tenantId, branchId },
      });

      if (!existing) {
        throw new NotFoundException(`Kitchen ticket ${ticketId} not found`);
      }

      const timestamps: Record<string, Date> = {};
      if (status === 'ready') timestamps.readyAt = new Date();
      if (status === 'served') timestamps.servedAt = new Date();

      return tx.kitchenTicket.update({
        where: { id: ticketId },
        data: { status, ...timestamps },
        include: { items: true },
      });
    });

    await this.auditLog.log({
      tenantId,
      userId,
      action: 'kds.ticket.status_changed',
      entityType: 'kitchen_ticket',
      entityId: ticketId,
      metadata: { status },
    });

    const dto = this.toResponseDto(updated);
    this.gateway.emitTicketStatusChanged(tenantId, branchId, dto);

    if (status === 'ready') {
      // Other modules (e.g. table status, customer notifications) subscribe to
      // this independently ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â KDS does not couple to them directly.
      this.eventEmitter.emit('order.ready_for_service', {
        tenantId,
        branchId,
        orderId: updated.orderId,
        kitchenTicketId: updated.id,
        tableId: updated.tableId,
        channel: updated.channel,
      });
    }

    return dto;
  }

  async listActiveTickets(
    tenantId: string,
    branchId: string,
  ): Promise<KitchenTicketResponseDto[]> {
    const tickets = await this.prisma.forTenant(tenantId, (tx) =>
      tx.kitchenTicket.findMany({
        where: {
          tenantId,
          branchId,
          status: { in: ['new', 'preparing', 'ready'] },
        },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      }),
    );

    return tickets.map((t) => this.toResponseDto(t));
  }

  nextStatusFor(current: KitchenTicketStatus): KitchenTicketStatus | null {
    return NEXT_STATUS[current];
  }

  private async maybePrintTicket(
    tenantId: string,
    branchId: string,
    ticket: KitchenTicketResponseDto,
  ): Promise<void> {
    const settings = await this.prisma.forTenant(tenantId, (tx) =>
      tx.branchKdsSettings.findFirst({ where: { tenantId, branchId } }),
    );

    if (!settings?.ticketPrintingEnabled) {
      return;
    }

    if (!settings.printerConnectionType) {
      this.logger.warn(
        `Printing enabled for branch ${branchId} but no printer configured`,
      );
      return;
    }

    try {
      await this.printerAdapter.printTicket(ticket, {
        connectionType: settings.printerConnectionType as 'network' | 'usb',
        host: settings.printerHost ?? undefined,
        port: settings.printerPort ?? undefined,
      });

      await this.prisma.forTenant(tenantId, (tx) =>
        tx.kitchenTicket.update({
          where: { id: ticket.id },
          data: { printed: true, printError: null },
        }),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown printer error';
      this.logger.error(`Failed to print ticket ${ticket.id}: ${message}`);

      // Printer failure must never block the ticket from being visible on screen ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â
      // it is already emitted over the socket by this point. We just record the error.
      await this.prisma.forTenant(tenantId, (tx) =>
        tx.kitchenTicket.update({
          where: { id: ticket.id },
          data: { printed: false, printError: message },
        }),
      );
    }
  }

  private toResponseDto(ticket: {
    id: string;
    branchId: string;
    orderId: string;
    tableId: string | null;
    channel: string;
    ticketSequence: number;
    status: string;
    isAddition: boolean;
    printed: boolean;
    createdAt: Date;
    readyAt: Date | null;
    servedAt: Date | null;
    items: Array<{
      id: string;
      orderItemId: string;
      menuItemName: string;
      quantity: number;
      notes: string | null;
    }>;
  }): KitchenTicketResponseDto {
    return {
      id: ticket.id,
      branchId: ticket.branchId,
      orderId: ticket.orderId,
      tableId: ticket.tableId,
      channel: ticket.channel,
      ticketSequence: ticket.ticketSequence,
      status: ticket.status,
      isAddition: ticket.isAddition,
      printed: ticket.printed,
      createdAt: ticket.createdAt,
      readyAt: ticket.readyAt,
      servedAt: ticket.servedAt,
      items: ticket.items.map((i) => ({
        id: i.id,
        orderItemId: i.orderItemId,
        menuItemName: i.menuItemName,
        quantity: i.quantity,
        notes: i.notes,
      })),
    };
  }
}
