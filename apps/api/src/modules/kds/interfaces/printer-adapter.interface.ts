import { KitchenTicketResponseDto } from '../dto/kitchen-ticket-response.dto';

export interface PrinterConnectionConfig {
  connectionType: 'network' | 'usb';
  host?: string;
  port?: number;
}

/**
 * Abstraction over any physical ticket printer. New printer protocols get a new
 * adapter implementing this interface — KDS service code never depends on a
 * concrete printer brand or protocol.
 */
export interface TicketPrinterAdapter {
  /**
   * Sends a formatted kitchen ticket to the physical printer.
   * Must throw on failure so the caller can persist print_error and continue
   * (a printer failure must never block the ticket from appearing on screen).
   */
  printTicket(
    ticket: KitchenTicketResponseDto,
    config: PrinterConnectionConfig,
  ): Promise<void>;
}

export const TICKET_PRINTER_ADAPTER = Symbol('TICKET_PRINTER_ADAPTER');
