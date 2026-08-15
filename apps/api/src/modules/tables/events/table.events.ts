// Phase 6 event constants — Tables module publishes these for other
// modules (Reservations, future KDS/Reports) to subscribe to instead of
// reaching into Tables' repository directly.

export const TABLE_EVENTS = {
  DINING_SESSION_OPENED: 'table.dining_session_opened',
  DINING_SESSION_CLOSED: 'table.dining_session_closed',
  TABLE_MERGED: 'table.merged',
  TABLE_SPLIT: 'table.split',
} as const;

export interface DiningSessionOpenedEvent {
  tenantId: string;
  branchId: string;
  tableId: string;
  diningSessionId: string;
}

export interface DiningSessionClosedEvent {
  tenantId: string;
  branchId: string;
  tableId: string;
  diningSessionId: string;
}
