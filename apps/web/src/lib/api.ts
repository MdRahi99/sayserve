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
};

/** What the client is allowed to send: what was chosen, never what it costs. */
export type QuoteLine = {
  slug: string;
  quantity: number;
  choices?: Record<string, string[]>;
  notes?: string;
};
