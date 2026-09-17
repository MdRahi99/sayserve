import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { corsOrigins } from "./config/env.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import { getSettings } from "./models/Settings.js";

export function createApp() {
  const app = express();

  app.use(cors({
    origin(origin, cb) {
      if (!origin || corsOrigins.includes("*") || corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error(`Origin ${origin} is not allowed.`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(attachUser);

  app.get("/api/health", async (_req, res) => {
    const settings = await getSettings().catch(() => null);
    res.json({
      ok: true,
      service: "sayserve-api",
      storeOpen: settings?.isOpen ?? null,
      time: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/chat", chatRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
