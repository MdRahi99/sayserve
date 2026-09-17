import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getDeps, assistantStatus } from "../assistant/registry.js";
import { handleMessage } from "../assistant/pipeline.js";
import { asyncRoute } from "../middleware/errors.js";
import { attachUser, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { priceCart, type CartLineInput } from "../lib/pricing.js";
import { Conversation } from "../models/Conversation.js";
import { getSettings } from "../models/Settings.js";

const router = Router();
router.use(attachUser);

const messageSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().min(8).max(64).optional(),
  /**
   * The cart as the browser has it. Sent every time rather than trusted from
   * the server's copy, because the customer may have edited it by hand between
   * messages — tapping and typing share one cart, so either can be ahead.
   */
  lines: z.array(z.object({
    slug: z.string().max(60),
    quantity: z.number().int().min(1).max(50),
    choices: z.record(z.array(z.string().max(60)).max(10)).optional(),
  })).max(40).optional(),
});

router.post("/", validate(messageSchema), asyncRoute(async (req, res) => {
  const { message, lines } = req.body as z.infer<typeof messageSchema>;
  const sessionId = req.body.sessionId || randomUUID();

  const [deps, settings, conversation] = await Promise.all([
    getDeps(),
    getSettings(),
    Conversation.findOne({ sessionId }),
  ]);

  const currentLines: CartLineInput[] =
    (lines as CartLineInput[] | undefined) ?? (conversation?.lines as CartLineInput[]) ?? [];

  const history = (conversation?.turns ?? [])
    .slice(-6)
    .map((t) => ({ role: t.role as "user" | "assistant", content: t.content }));

  const result = await handleMessage(message, currentLines, deps, history);

  await Conversation.findOneAndUpdate(
    { sessionId },
    {
      sessionId,
      user: req.user?.id ?? null,
      lines: result.lines,
      $push: {
        turns: {
          $each: [
            { role: "user", content: message },
            {
              role: "assistant",
              content: result.reply,
              route: result.route,
              modelCalled: result.telemetry.modelCalled,
              ms: result.telemetry.ms,
              safetyRule: result.telemetry.safetyRule ?? null,
            },
          ],
          // Keep a chat readable rather than unbounded.
          $slice: -40,
        },
      },
    },
    { upsert: true }
  );

  res.json({
    sessionId,
    reply: result.reply,
    route: result.route,
    lines: result.lines,
    quickReplies: result.quickReplies,
    cart: result.cart,
    storeOpen: settings.isOpen,
    telemetry: { modelCalled: result.telemetry.modelCalled, ms: result.telemetry.ms },
  });
}));

router.get("/:sessionId", asyncRoute(async (req, res) => {
  const conversation = await Conversation.findOne({ sessionId: req.params.sessionId }).lean();
  if (!conversation) return res.json({ turns: [], lines: [] });
  const deps = await getDeps();
  res.json({
    turns: conversation.turns.map((t) => ({ role: t.role, content: t.content, at: t.at })),
    lines: conversation.lines,
    cart: priceCart((conversation.lines as CartLineInput[]) ?? [], deps.menu),
  });
}));

/** What the assistant is actually running with. Shown on the dashboard. */
router.get("/_status/health", requireRole("staff", "admin"), (_req, res) => {
  res.json(assistantStatus());
});

export default router;
