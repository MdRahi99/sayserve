import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must be at least 24 characters"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_DOMAIN: z.string().optional(),
  DEMO_TTL_HOURS: z.coerce.number().default(24),

  // The assistant works without these. They add meaning-matching and
  // conversation; the parser and the safety gate need neither.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MODEL: z.string().default("voyage-3-lite"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
  console.error("Environment is not configured:\n" + lines.join("\n"));
  console.error("Copy .env.example to .env and fill it in.");
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
