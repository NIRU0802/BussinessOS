export class KitchenTicketItemResponseDto {
  id: string;
  orderItemId: string;
  menuItemName: string;
  quantity: number;
  notes: string | null;
}

export class KitchenTicketResponseDto {
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
  items: KitchenTicketItemResponseDto[];
}
