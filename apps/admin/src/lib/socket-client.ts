import { io, type Socket } from "socket.io-client";
import { config } from "./config";
import { tokenStorage } from "./token-storage";

let socket: Socket | null = null;

/**
 * Lazily creates a single shared socket connection to the /orders
 * namespace. Uses a function-form `auth` callback so every (re)connection
 * attempt reads the CURRENT in-memory access token — critical since access
 * tokens expire every 15 minutes and the socket may reconnect long after
 * the initial page load.
 */
export function getOrdersSocket(): Socket {
  if (socket) return socket;

  socket = io(`${config.socketUrl}/orders`, {
    autoConnect: false,
    transports: ["websocket"],
    auth: (cb) => {
      cb({ token: tokenStorage.getAccessToken() });
    },
  });

  return socket;
}

export function disconnectOrdersSocket(): void {
  socket?.disconnect();
  socket = null;
}
