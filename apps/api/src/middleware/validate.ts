import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";

/**
 * Every request body is parsed by a schema before a route sees it. Nothing
 * reaches a model or the pricing engine without being the shape it claims.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json(formatZod(result.error));
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return res.status(400).json(formatZod(result.error));
    Object.assign(req.query, result.data);
    next();
  };
}

function formatZod(error: ZodError) {
  return {
    error: "That request was not valid.",
    details: error.issues.map((i) => ({
      field: i.path.join(".") || "(body)",
      message: i.message,
    })),
  };
}
