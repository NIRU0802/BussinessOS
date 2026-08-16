import { IsIn } from 'class-validator';

export const KITCHEN_TICKET_STATUSES = [
  'new',
  'preparing',
  'ready',
  'served',
] as const;
export type KitchenTicketStatus = (typeof KITCHEN_TICKET_STATUSES)[number];

export class UpdateTicketStatusDto {
  @IsIn(KITCHEN_TICKET_STATUSES)
  status: KitchenTicketStatus;
}
