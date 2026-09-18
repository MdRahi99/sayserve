/**
 * The one place the web app talks to the API.
 *
 * Note what is NOT here: any arithmetic. The client never adds up a cart. It
 * sends what the customer chose to /orders/quote and renders whatever comes
 * back. That is the same rule the API enforces, expressed on this side as a
 * refusal to even own the numbers.
 */

// These two modules import nothing at all, so importing their types costs the
// bundle nothing and keeps one definition of the contract across both apps.
import type { PricedCart, PricingProblem } from "@api/lib/pricing";
import type { OrderStatus } from "@api/lib/orderState";

export type { PricedCart, PricingProblem, OrderStatus };

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export type MenuOption = {
  name: string;
  priceDelta: number;
  linkedItem?: string | null;
  default?: boolean;
};

export type OptionGroup = {
  groupId: string;
  name: string;
  min: number;
  max: number;
  options: MenuOption[];
};

export type MenuItem = {
  _id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  aliases: string[];
  tags: string[];
  allergens: string[];
  optionGroups: string[];
  available: boolean;
  servingNow: boolean;
  popular: boolean;
  maxQuantityPerOrder: number;
  availableFrom?: string | null;
  availableTo?: string | null;
};

export type MenuResponse = {
  count: number;
  items: MenuItem[];
  optionGroups: OptionGroup[];
};

export type QuoteResponse = PricedCart & {
  deliveryFee: number;
  total: number;
  storeOpen: boolean;
  prepTimeMinutes: number;
  /** False when Stripe is not configured; the card option is then hidden. */
  paymentsEnabled: boolean;
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    // A dead API should say so plainly, not throw a browser-shaped error at
    // the customer. The free tier sleeps, so this happens for real.
    throw new ApiError(0, "Could not reach the kitchen. It may be waking up — try again in a moment.");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && String(body.error)) ||
      `Request failed (${res.status}).`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

export type OrderLine = {
  slug: string;
  name: string;
  quantity: number;
  basePrice: number;
  choices: { groupId: string; groupName: string; optionName: string; priceDelta: number }[];
  unitPrice: number;
  lineTotal: number;
  notes?: string;
};

export type StatusEvent = {
  from: string;
  to: OrderStatus;
  label: string;
  actor: "customer" | "staff" | "admin" | "system";
  reason?: string;
  at: string;
};

export type Order = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  fulfilment: "collection" | "delivery";
  customer: { name: string; phone: string; email?: string };
  address?: { line1?: string; line2?: string; postcode?: string; notes?: string };
  lines: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: { method: "card" | "on_collection"; status: string };
  notes?: string;
  readyAt: string | null;
  scheduledFor: string | null;
  guestToken: string | null;
  statusHistory: StatusEvent[];
  createdAt: string;
};

export type TrackedOrder = {
  order: Order;
  timeline: { status: OrderStatus; label: string }[];
  canCancel: boolean;
};

export type User = { id: string; name: string; role: "customer" | "staff" | "admin"; isDemo: boolean };

export type StoreSettings = {
  restaurantName: string;
  isOpen: boolean;
  prepTimeMinutes: number;
  deliveryEnabled: boolean;
  deliveryFee: number;
  deliveryRadiusMiles: number;
  minDeliveryOrder: number;
};

export type Stats = {
  days: number;
  sales: number;
  orders: number;
  averageOrder: number;
  averagePrepMinutes: number | null;
  prepSampleSize: number;
  ordersByHour: { hour: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  byStatus: Record<string, number>;
};

export type ChatReply = {
  sessionId: string;
  reply: string;
  route: string;
  lines: QuoteLine[];
  quickReplies: { label: string; value: string }[];
  cart: PricedCart | null;
  storeOpen: boolean;
  telemetry: { modelCalled: boolean; ms: number };
};

export type AssistantStats = {
  days: number;
  messages: number;
  modelCalls: number;
  withoutModel: number;
  withoutModelShare: number | null;
  avgMs: number;
  byRoute: Record<string, number>;
  refusals: number;
  needsReview: {
    sessionId: string; route: string; reply: string;
    safetyRule: string | null; at: string;
  }[];
  providers: {
    model: string | null; embeddings: string | null;
    vectorsBuilt: number; indexedAt: string | null;
  };
};

export type CheckoutBody = {
  lines: QuoteLine[];
  fulfilment: "collection" | "delivery";
  customer: { name: string; phone: string; email?: string };
  address?: { line1: string; line2?: string; postcode: string; notes?: string };
  paymentMethod: "card" | "on_collection";
  notes?: string;
  source?: "menu" | "chat" | "voice" | "mixed";
  idempotencyKey: string;
};

export const api = {
  menu: (params: { category?: string; search?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.search) qs.set("search", params.search);
    const suffix = qs.toString() ? `?${qs}` : "";
    return call<MenuResponse>(`/api/menu${suffix}`);
  },

  quote: (lines: QuoteLine[], fulfilment: "collection" | "delivery" = "collection") =>
    call<QuoteResponse>("/api/orders/quote", {
      method: "POST",
      body: JSON.stringify({ lines, fulfilment }),
    }),

  health: () => call<{ ok: boolean; storeOpen: boolean | null }>("/api/health"),

  createOrder: (body: CheckoutBody) =>
    call<{ order: Order; checkoutUrl?: string; idempotentReplay?: boolean }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Guests pass the token they were given at checkout; signed-in users do not. */
  getOrder: (id: string, token?: string | null) =>
    call<TrackedOrder>(`/api/orders/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`),

  cancelOrder: (id: string, token?: string | null) =>
    call<{ order: Order }>(`/api/orders/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify(token ? { token } : {}),
    }),

  myOrders: () => call<{ orders: Order[] }>("/api/orders/mine"),

  kitchenBoard: () =>
    call<{ columns: { new: Order[]; preparing: Order[]; ready: Order[] } }>(
      "/api/orders/kitchen/board"
    ),

  setOrderStatus: (
    id: string, to: OrderStatus,
    extra: { reason?: string; readyInMinutes?: number } = {}
  ) =>
    call<{ order: Order }>(`/api/orders/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ to, ...extra }),
    }),

  chat: (message: string, sessionId: string | null, lines: QuoteLine[]) =>
    call<ChatReply>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, sessionId: sessionId ?? undefined, lines }),
    }),

  admin: {
    assistant: (days = 7) => call<AssistantStats>(`/api/admin/assistant?days=${days}`),

    menu: () => call<{ items: MenuItem[]; optionGroups: OptionGroup[] }>("/api/admin/menu"),

    setAvailability: (slug: string, available: boolean) =>
      call<{ item: MenuItem }>(`/api/admin/menu/${slug}/availability`, {
        method: "POST", body: JSON.stringify({ available }),
      }),

    updateItem: (slug: string, patch: Partial<MenuItem>) =>
      call<{ item: MenuItem }>(`/api/admin/menu/${slug}`, {
        method: "PATCH", body: JSON.stringify(patch),
      }),

    createItem: (item: Partial<MenuItem>) =>
      call<{ item: MenuItem }>("/api/admin/menu", {
        method: "POST", body: JSON.stringify(item),
      }),

    deleteItem: (slug: string) =>
      call<{ deleted: string; warning?: string }>(`/api/admin/menu/${slug}`, { method: "DELETE" }),

    settings: () => call<{ settings: StoreSettings }>("/api/admin/settings"),

    updateSettings: (patch: Partial<StoreSettings>) =>
      call<{ settings: StoreSettings }>("/api/admin/settings", {
        method: "PATCH", body: JSON.stringify(patch),
      }),

    setOpen: (isOpen: boolean) =>
      call<{ settings: StoreSettings }>("/api/admin/settings/open", {
        method: "POST", body: JSON.stringify({ isOpen }),
      }),

    stats: (days = 1) => call<Stats>(`/api/admin/stats?days=${days}`),

    simulateRush: (count = 5) =>
      call<{ created: number; orderNumbers: number[] }>("/api/admin/demo/rush", {
        method: "POST", body: JSON.stringify({ count }),
      }),

    clearDemoOrders: () =>
      call<{ deleted: number }>("/api/admin/demo/orders", { method: "DELETE" }),
  },

  auth: {
    me: () => call<{ user: User }>("/api/auth/me"),
    login: (email: string, password: string) =>
      call<{ user: User }>("/api/auth/login", {
        method: "POST", body: JSON.stringify({ email, password }),
      }),
    register: (body: { name: string; email: string; password: string; phone?: string }) =>
      call<{ user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    demo: (role: "customer" | "staff") =>
      call<{ user: User }>("/api/auth/demo", { method: "POST", body: JSON.stringify({ role }) }),
    logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  },
};

/** What the client is allowed to send: what was chosen, never what it costs. */
export type QuoteLine = {
  slug: string;
  quantity: number;
  choices?: Record<string, string[]>;
  notes?: string;
};
