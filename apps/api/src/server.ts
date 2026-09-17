import { createServer } from "node:http";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { createRealtime } from "./realtime.js";

const app = createApp();
const httpServer = createServer(app);
createRealtime(httpServer);

connectDB(env.MONGODB_URI)
  .then(() => {
    httpServer.listen(env.PORT, () => {
      console.log(`sayserve-api listening on http://localhost:${env.PORT}`);
      console.log("Realtime ready — staff join the kitchen room on connect.");
    });
  })
  .catch((err) => {
    console.error("Could not start:", err.message);
    process.exit(1);
  });
