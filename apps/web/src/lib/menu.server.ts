import "server-only";
import { API_URL, type MenuResponse } from "./api";

/**
 * The menu, fetched on the server and cached at the edge.
 *
 * The browser used to ask for this after the page loaded, which meant a cold
 * API — the free tier sleeps after fifteen minutes — showed a visitor thirty
 * seconds of grey boxes on the first screen they saw.
 *
 * Fetching here puts the items in the HTML. Vercel caches that response, so the
 * menu appears instantly whether or not the API is awake, and the API gets its
 * thirty seconds to wake up quietly in the background. By the time anyone adds
 * something to a cart — which does need the live API, for the price — it is up.
 *
 * The cost is that a sold-out item can be stale for a few minutes. That is the
 * right trade: a stale "available" resolves itself at checkout, where the
 * server checks again and says so. A blank menu loses the customer.
 */
export const MENU_REVALIDATE_SECONDS = 300;

export async function getMenu(): Promise<MenuResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/menu`, {
      next: { revalidate: MENU_REVALIDATE_SECONDS, tags: ["menu"] },
    });
    if (!res.ok) return null;
    return (await res.json()) as MenuResponse;
  } catch {
    // A sleeping or broken API must not take the page down with it. The client
    // components fall back to fetching for themselves.
    return null;
  }
}
