import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'net';
import {
  PrinterConnectionConfig,
  TicketPrinterAdapter,
} from '../interfaces/printer-adapter.interface';
import { KitchenTicketResponseDto } from '../dto/kitchen-ticket-response.dto';
import { EscPosBuilder } from './escpos.util';

/**
 * ESC/POS printer reachable over the network (most kitchen thermal printers
 * expose a raw TCP socket, typically on port 9100).
 */
@Injectable()
export class NetworkEscPosPrinterAdapter implements TicketPrinterAdapter {
  private readonly logger = new Logger(NetworkEscPosPrinterAdapter.name);
  private static readonly CONNECT_TIMEOUT_MS = 5000;

  async printTicket(
    ticket: KitchenTicketResponseDto,
    config: PrinterConnectionConfig,
  ): Promise<void> {
    if (config.connectionType !== 'network') {
      throw new Error(
        `NetworkEscPosPrinterAdapter received a non-network config: ${config.connectionType}`,
      );
    }
    if (!config.host || !config.port) {
      throw new Error('Printer host/port not configured for this branch');
    }

    const payload = this.buildPayload(ticket);

    await this.sendToSocket(config.host, config.port, payload);
  }

  private buildPayload(ticket: KitchenTicketResponseDto): Buffer {
    const builder = new EscPosBuilder()
      .init()
      .centerAlign()
      .doubleHeightOn()
      .boldOn();

    const sourceLabel = ticket.tableId
      ? `TABLE ${ticket.tableId.slice(0, 8).toUpperCase()}`
      : this.channelLabel(ticket.channel);

    builder
      .text(sourceLabel)
      .doubleHeightOff()
      .boldOff()
      .leftAlign()
      .divider()
      .text(
        `Ticket #${ticket.ticketSequence}${ticket.isAddition ? '  (ADDITION)' : ''}`,
      )
      .text(`Channel: ${ticket.channel}`)
      .text(`Created: ${new Date(ticket.createdAt).toLocaleTimeString()}`)
      .divider();

    for (const item of ticket.items) {
      builder
        .boldOn()
        .text(`${item.quantity} x ${item.menuItemName}`)
        .boldOff();
      if (item.notes) {
        builder.text(`  note: ${item.notes}`);
      }
    }

    builder.divider().feed(3).cutPaper();

    return builder.build();
  }

  private channelLabel(channel: string): string {
    const map: Record<string, string> = {
      pos: 'DINE-IN',
      qr: 'DINE-IN',
      delivery_zomato: 'ZOMATO',
      delivery_swiggy: 'SWIGGY',
      whatsapp: 'WHATSAPP ORDER',
    };
    return map[channel] ?? channel.toUpperCase();
  }

  private sendToSocket(
    host: string,
    port: number,
    payload: Buffer,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let settled = false;

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (err) reject(err);
        else resolve();
      };

      socket.setTimeout(NetworkEscPosPrinterAdapter.CONNECT_TIMEOUT_MS);

      socket.once('timeout', () =>
        finish(new Error(`Printer connection timed out (${host}:${port})`)),
      );
      socket.once('error', (err) => finish(err));

      socket.connect(port, host, () => {
        socket.write(payload, (err) => {
          if (err) {
            finish(err);
            return;
          }
          finish();
        });
      });
    });
  }
}
