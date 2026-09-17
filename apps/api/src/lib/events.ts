/**
 * A tiny seam between the routes and Socket.io.
 *
 * Routes call `emitOrderNew` and never import the server, so there is no
 * circular dependency and the whole HTTP layer still works with no socket
 * attached — which is exactly what the tests do.
 */
import type { Server } from "socket.io";

let io: Server | null = null;

export function attachRealtime(server: Server) {
  io = server;
}

export const KITCHEN_ROOM = "kitchen";
export const orderRoom = (id: string) => `order:${id}`;

/** A new order for the kitchen to see. */
export function emitOrderNew(order: unknown) {
  io?.to(KITCHEN_ROOM).emit("order:new", order);
}

/** A status change: the kitchen board and that one customer both care. */
export function emitOrderUpdated(order: { id: string }) {
  io?.to(KITCHEN_ROOM).emit("order:updated", order);
  io?.to(orderRoom(order.id)).emit("order:updated", order);
}

export function emitStoreStatus(isOpen: boolean) {
  io?.emit("store:status", { isOpen });
}
