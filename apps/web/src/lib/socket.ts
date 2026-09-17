"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

/**
 * One socket for the whole tab.
 *
 * `withCredentials` matters: the sign-in cookie rides along on the handshake,
 * which is how the server knows to put staff in the kitchen room. Without it
 * every connection would be anonymous.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
