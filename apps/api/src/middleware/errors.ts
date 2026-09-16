import type { NextFunction, Request, Response } from "express";
import { isProd } from "../config/env.js";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export const asyncRoute =
  <T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "No such endpoint." });
}

export function errorHandler(
  err: unknown, _req: Request, res: Response, _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  // A duplicate key on idempotencyKey is a retry, not a failure worth logging loudly.
  if (typeof err === "object" && err && "code" in err && (err as { code: number }).code === 11000) {
    return res.status(409).json({ error: "That record already exists.", code: "duplicate" });
  }
  console.error(err);
  res.status(500).json({
    error: "Something went wrong on our side.",
    ...(isProd ? {} : { detail: String(err) }),
  });
}
