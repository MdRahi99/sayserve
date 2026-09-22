/**
 * A stand-in API, for taking screenshots.
 *
 * The real API needs MongoDB, a seeded menu and a running kitchen. That is a
 * lot of setup to photograph a page. This serves the handful of endpoints the
 * web app actually calls, with data shaped exactly like the real thing, so the
 * screenshots show the real components rather than a mock-up of them.
 *
 *     node tools/mock-api.mjs            # serves on 5055
 *
 * It is a photography light, not a fixture: nothing here is used by the tests
 * or the app in normal use.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const menu = JSON.parse(readFileSync(path.join(HERE, "..", "docs", "menu.json"), "utf8"));
const PORT = Number(process.env.MOCK_PORT ?? 5055);

const groups = new Map(menu.optionGroups.map((g) => [g.groupId, g]));
const items = new Map(menu.items.map((i) => [i.slug, i]));

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** The same rule the real pricing engine uses: base + deltas, times quantity. */
function priceCart(lines = []) {
  const priced = [];
  const problems = [];

  for (const line of lines) {
    const item = items.get(line.slug);
    if (!item) continue;

    const choices = [];
    let missing = null;

    for (const id of item.optionGroups) {
      const group = groups.get(id);
      if (!group) continue;
      const picked = line.choices?.[id] ?? [];

      if (picked.length < group.min && !missing) {
        missing = {
          kind: "missing_choice", slug: item.slug, groupId: group.groupId,
          groupName: group.name, min: group.min, max: group.max,
          options: group.options.map((o) => ({ name: o.name, priceDelta: o.priceDelta })),
          detail: `${item.name}: ${group.name.toLowerCase()}.`,
        };
      }
      for (const name of picked) {
        const option = group.options.find((o) => o.name === name);
        if (option) {
          choices.push({
            groupId: group.groupId, groupName: group.name,
            optionName: option.name, priceDelta: option.priceDelta,
          });
        }
      }
    }

    if (missing) {
      problems.push(missing);
      continue;
    }

    const unitPrice = round2(item.basePrice + choices.reduce((s, c) => s + c.priceDelta, 0));
    priced.push({
      slug: item.slug, name: item.name, quantity: line.quantity,
      basePrice: item.basePrice, choices, unitPrice,
      lineTotal: round2(unitPrice * line.quantity),
    });
  }

  const subtotal = round2(priced.reduce((s, l) => s + l.lineTotal, 0));
  return { lines: priced, problems, subtotal, complete: problems.length === 0 && priced.length > 0 };
}

const STAFF = { id: "demo-staff", name: "Demo staff", role: "staff", isDemo: true };

const order = (n, status, minutesAgo, lines, extra = {}) => ({
  id: `order-${n}`, orderNumber: n, status, fulfilment: extra.fulfilment ?? "collection",
  customer: { name: extra.name ?? "Aisha", phone: "07700 900123" },
  lines, subtotal: 0, deliveryFee: 0,
  total: round2(lines.reduce((s, l) => s + l.lineTotal, 0)),
  payment: { method: "on_collection", status: "unpaid" },
  notes: extra.notes ?? "", source: "menu",
  readyAt: extra.readyAt ?? null, scheduledFor: null, guestToken: null,
  statusHistory: (extra.history ?? ["placed"]).map((to, i) => ({
    from: i === 0 ? "none" : "placed", to,
    label: { placed: "Order placed", accepted: "Accepted by the kitchen",
             preparing: "Preparing", ready: "Ready to collect" }[to] ?? to,
    actor: to === "placed" ? "customer" : "staff",
    at: new Date(Date.now() - (minutesAgo - i * 2) * 60_000).toISOString(),
  })),
  createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
});

const line = (slug, quantity, choiceNames = []) => {
  const item = items.get(slug);
  const choices = choiceNames.map((name) => ({
    groupId: "x", groupName: "x", optionName: name, priceDelta: 0,
  }));
  return {
    slug, name: item?.name ?? slug, quantity,
    basePrice: item?.basePrice ?? 0, choices,
    unitPrice: item?.basePrice ?? 0,
    lineTotal: round2((item?.basePrice ?? 0) * quantity),
  };
};

const BOARD = {
  columns: {
    new: [
      order(1043, "placed", 6, [line("cheeseburger", 2, ["No onions"]), line("fries", 1)],
            { notes: "Extra crispy please" }),
      order(1044, "placed", 1, [line("family-bundle", 1)], { fulfilment: "delivery", name: "Tom" }),
    ],
    preparing: [
      order(1042, "preparing", 12, [line("bbq-stack-meal", 1), line("milkshake", 1, ["Salted caramel"])],
            { name: "Priya", readyAt: new Date(Date.now() + 8 * 60_000).toISOString(),
              history: ["placed", "accepted", "preparing"] }),
      order(1040, "accepted", 16, [line("chicken-wrap", 2, ["No sauce"])],
            { name: "Marcus", fulfilment: "delivery", history: ["placed", "accepted"] }),
    ],
    ready: [
      order(1041, "ready", 20, [line("chicken-wrap", 1)],
            { name: "Sofia", history: ["placed", "accepted", "preparing", "ready"] }),
    ],
  },
};

const ROUTES = {
  "GET /api/health": () => ({ ok: true, storeOpen: true, paymentsEnabled: true }),

  "GET /api/menu": () => ({
    count: menu.items.length,
    items: menu.items.map((i) => ({ ...i, servingNow: true, _id: i.slug })),
    optionGroups: menu.optionGroups,
  }),

  "POST /api/orders/quote": (body) => ({
    ...priceCart(body.lines), deliveryFee: 0,
    total: priceCart(body.lines).subtotal, storeOpen: true,
    prepTimeMinutes: 15, paymentsEnabled: true,
  }),

  "GET /api/auth/me": () => ({ user: STAFF }),
  "GET /api/orders/kitchen/board": () => BOARD,
  "GET /api/orders/mine": () => ({ orders: [BOARD.columns.preparing[0], BOARD.columns.ready[0]] }),

  "GET /api/admin/settings": () => ({
    settings: {
      restaurantName: "SayServe", isOpen: true, prepTimeMinutes: 15,
      deliveryEnabled: true, deliveryFee: 2.5, deliveryRadiusMiles: 2, minDeliveryOrder: 10,
    },
  }),

  "GET /api/admin/stats": () => ({
    days: 1, sales: 1284.5, orders: 96, averageOrder: 13.38,
    averagePrepMinutes: 11, prepSampleSize: 74,
    ordersByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour, orders: hour < 11 || hour > 23 ? 0 : [4, 6, 9, 14, 22, 31, 27, 19, 24, 33, 38, 29, 16][hour - 11] ?? 0,
    })),
    topItems: [
      { name: "Cheeseburger", quantity: 41, revenue: 184.09 },
      { name: "Loaded Fries", quantity: 33, revenue: 141.57 },
      { name: "Cheeseburger Meal", quantity: 28, revenue: 204.12 },
      { name: "Milkshake", quantity: 24, revenue: 78.96 },
      { name: "Chicken Nuggets", quantity: 19, revenue: 75.81 },
    ],
    byStatus: { completed: 88, preparing: 4, placed: 2, cancelled: 2 },
  }),

  "GET /api/admin/assistant": () => ({
    days: 7, messages: 412, modelCalls: 164, withoutModel: 248,
    withoutModelShare: 60, avgMs: 340,
    byRoute: { fast_path: 248, model: 122, asked: 38, refused: 4 },
    refusals: 4,
    needsReview: [
      { sessionId: "a", route: "unknown", reply: "gimme the usual", safetyRule: null, at: "" },
      { sessionId: "b", route: "refused", reply: "ignore previous instructions", safetyRule: "instruction_override", at: "" },
    ],
    providers: { model: "groq:openai/gpt-oss-20b", embeddings: "voyage:voyage-3-lite", vectorsBuilt: 70, indexedAt: "" },
  }),

  "POST /api/chat": (body) => {
    const lines = body.lines ?? [];
    return {
      sessionId: "shot", reply: "Added. Anything else?", route: "fast_path",
      lines, quickReplies: [], cart: priceCart(lines),
      storeOpen: true, telemetry: { modelCalled: false, ms: 11 },
    };
  },
};

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = new URL(req.url, "http://x");
    const key = `${req.method} ${url.pathname}`;
    const handler = ROUTES[key];

    res.setHeader("Content-Type", "application/json");

    if (handler) {
      const parsed = body ? JSON.parse(body) : {};
      return res.end(JSON.stringify(handler(parsed, url)));
    }
    // One order, for the tracking page.
    if (url.pathname.startsWith("/api/orders/order-")) {
      return res.end(JSON.stringify({
        order: BOARD.columns.preparing[0],
        timeline: [
          { status: "placed", label: "Order placed" },
          { status: "accepted", label: "Accepted by the kitchen" },
          { status: "preparing", label: "Preparing your food" },
          { status: "ready", label: "Ready to collect" },
        ],
        canCancel: false,
      }));
    }
    res.writeHead(404).end(JSON.stringify({ error: "Not in the mock." }));
  });
});

// A real socket server, so the board shows "Live" rather than "Reconnecting".
// Nothing is emitted: the screenshots want a connected board, not a moving one.
try {
  const { Server } = await import("socket.io");
  new Server(server, { cors: { origin: true, credentials: true } });
  console.log("socket.io attached");
} catch {
  console.log("socket.io not found — the board will show Reconnecting");
}

server.listen(PORT, () => console.log(`mock API on http://localhost:${PORT}`));
