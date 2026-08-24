"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getOrdersSocket } from "@/lib/socket-client";
import type { Order } from "@/lib/api/orders-api";
import type { TableStatus } from "@/lib/enums";

interface TableStatusChangedPayload {
  tableId: string;
  status: TableStatus;
}

interface UseOrdersSocketOptions {
  branchId: string | null;
  onOrderEvent?: (order: Order) => void;
  onTableStatusChanged?: (payload: TableStatusChangedPayload) => void;
  onVoidRefundRequested?: (payload: { orderId: string; requestId: string; type: string }) => void;
}

/**
 * Joins the tenant:branch Socket.IO room for real-time floor/order updates.
 * Read-only per the web-dashboard sync model — never emits order mutations,
 * only listens.
 */
export function useOrdersSocket({
  branchId,
  onOrderEvent,
  onTableStatusChanged,
  onVoidRefundRequested,
}: UseOrdersSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const joinedRoomRef = useRef<string | null>(null);

  const handlersRef = useRef({ onOrderEvent, onTableStatusChanged, onVoidRefundRequested });
  handlersRef.current = { onOrderEvent, onTableStatusChanged, onVoidRefundRequested };

  const rejoin = useCallback((newBranchId: string | null) => {
    const socket = getOrdersSocket();
    if (joinedRoomRef.current) {
      socket.emit("leave-branch", { branchId: joinedRoomRef.current });
      joinedRoomRef.current = null;
    }
    if (newBranchId) {
      socket.emit("join-branch", { branchId: newBranchId });
      joinedRoomRef.current = newBranchId;
    }
  }, []);

  useEffect(() => {
    const socket = getOrdersSocket();

    function handleConnect() {
      setIsConnected(true);
      if (branchId) rejoin(branchId);
    }
    function handleDisconnect() {
      setIsConnected(false);
      joinedRoomRef.current = null;
    }
    function handleOrderCreated(order: Order) {
      handlersRef.current.onOrderEvent?.(order);
    }
    function handleOrderUpdated(order: Order) {
      handlersRef.current.onOrderEvent?.(order);
    }
    function handlePaid(order: Order) {
      handlersRef.current.onOrderEvent?.(order);
    }
    function handleVoidedOrRefunded(order: Order) {
      handlersRef.current.onOrderEvent?.(order);
    }
    function handleTableStatus(payload: TableStatusChangedPayload) {
      handlersRef.current.onTableStatusChanged?.(payload);
    }
    function handleVoidRefundRequested(payload: {
      orderId: string;
      requestId: string;
      type: string;
    }) {
      handlersRef.current.onVoidRefundRequested?.(payload);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("order:items-added", handleOrderUpdated);
    socket.on("order:paid", handlePaid);
    socket.on("order:voided-or-refunded", handleVoidedOrRefunded);
    socket.on("table:status-changed", handleTableStatus);
    socket.on("order:void-refund-requested", handleVoidRefundRequested);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("order:items-added", handleOrderUpdated);
      socket.off("order:paid", handlePaid);
      socket.off("order:voided-or-refunded", handleVoidedOrRefunded);
      socket.off("table:status-changed", handleTableStatus);
      socket.off("order:void-refund-requested", handleVoidRefundRequested);
      if (joinedRoomRef.current) {
        socket.emit("leave-branch", { branchId: joinedRoomRef.current });
        joinedRoomRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-join when the active branch changes (e.g. branch switcher).
  useEffect(() => {
    if (isConnected) rejoin(branchId);
  }, [branchId, isConnected, rejoin]);

  return { isConnected };
}
