import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

connectDB(env.MONGODB_URI)
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`sayserve-api listening on http://localhost:${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Could not start:", err.message);
    process.exit(1);
  });
