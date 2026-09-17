import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { corsOrigins, env } from "./config/env.js";
import { attachRealtime, KITCHEN_ROOM, orderRoom } from "./lib/events.js";
import { Order } from "./models/Order.js";
import { User } from "./models/User.js";
import { COOKIE_NAME } from "./middleware/auth.js";

/**
 * Rooms, not broadcasts.
 *
 * Staff join `kitchen` and see every order. A customer joins only the room for
 * an order they can prove is theirs — by owning it, or by holding the guest
 * token from checkout. Without that check, anyone could listen to the whole
 * shop by guessing an id.
 */
export function createRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    const raw = socket.handshake.headers.cookie ?? "";
    const token = raw.split(";")
      .map((c) => c.trim().split("="))
      .find(([k]) => k === COOKIE_NAME)?.[1];

    if (!token) return next(); // anonymous: may still watch one order

    try {
      const payload = jwt.verify(decodeURIComponent(token), env.JWT_SECRET) as { sub: string };
      const user = await User.findById(payload.sub).lean();
      if (user) {
        socket.data.userId = String(user._id);
        socket.data.role = user.role;
      }
    } catch {
      // An expired cookie just means anonymous.
    }
    next();
  });

  io.on("connection", (socket) => {
    if (["staff", "admin"].includes(socket.data.role)) {
      socket.join(KITCHEN_ROOM);
    }

    socket.on("watch:order", async ({ id, token }: { id: string; token?: string }) => {
      const order = await Order.findById(id).lean().catch(() => null);
      if (!order) return;

      const isOwner = socket.data.userId && String(order.user) === socket.data.userId;
      const isGuest = order.guestToken && token === order.guestToken;
      const isStaff = ["staff", "admin"].includes(socket.data.role);
      if (!isOwner && !isGuest && !isStaff) return;

      socket.join(orderRoom(id));
    });

    socket.on("unwatch:order", ({ id }: { id: string }) => socket.leave(orderRoom(id)));
  });

  attachRealtime(io);
  return io;
}
