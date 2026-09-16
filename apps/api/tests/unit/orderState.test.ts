import { describe, expect, it } from "vitest";
import {
  canTransition, customerCanCancel, customerTimeline, isTerminal,
  nextStatuses, ORDER_STATUSES, TRANSITIONS, type OrderStatus,
} from "../../src/lib/orderState.js";

const allow = (from: OrderStatus, to: OrderStatus, actor: any, fulfilment: any = "collection", reason?: string) =>
  canTransition({ from, to, actor, fulfilment, reason });

describe("order state machine", () => {
  it("walks a collection order from placed to completed", () => {
    const path: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "completed"];
    for (let i = 0; i < path.length - 1; i++) {
      const check = allow(path[i]!, path[i + 1]!, "staff");
      expect(check.ok, `${path[i]} → ${path[i + 1]}`).toBe(true);
    }
  });

  it("walks a delivery order out for delivery instead of ready", () => {
    expect(allow("preparing", "out_for_delivery", "staff", "delivery").ok).toBe(true);
    expect(allow("preparing", "out_for_delivery", "staff", "collection").ok).toBe(false);
    expect(allow("preparing", "ready", "staff", "delivery").ok).toBe(false);
  });

  it("refuses to skip a step", () => {
    expect(allow("placed", "ready", "staff").ok).toBe(false);
    expect(allow("placed", "completed", "staff").ok).toBe(false);
    expect(allow("accepted", "completed", "staff").ok).toBe(false);
  });

  it("refuses to go backwards", () => {
    expect(allow("preparing", "accepted", "staff").ok).toBe(false);
    expect(allow("completed", "preparing", "admin").ok).toBe(false);
  });

  it("lets the customer cancel before the kitchen accepts, and not after", () => {
    expect(allow("placed", "cancelled", "customer").ok).toBe(true);
    expect(customerCanCancel("placed")).toBe(true);

    expect(allow("accepted", "cancelled", "customer").ok).toBe(false);
    expect(allow("preparing", "cancelled", "customer").ok).toBe(false);
    expect(customerCanCancel("accepted")).toBe(false);
    expect(customerCanCancel("preparing")).toBe(false);
  });

  it("does not let a customer accept or reject their own order", () => {
    const accept = allow("placed", "accepted", "customer");
    expect(accept.ok).toBe(false);
    expect(accept.ok === false && accept.code).toBe("wrong_actor");
    expect(allow("placed", "rejected", "customer").ok).toBe(false);
  });

  it("requires a reason when the kitchen rejects", () => {
    const noReason = allow("placed", "rejected", "staff");
    expect(noReason.ok).toBe(false);
    expect(noReason.ok === false && noReason.code).toBe("needs_reason");

    const withReason = allow("placed", "rejected", "staff", "collection", "Out of buns");
    expect(withReason.ok).toBe(true);
  });

  it("marks a rejection as refundable", () => {
    const check = allow("placed", "rejected", "staff", "collection", "Too busy");
    expect(check.ok && check.transition.refunds).toBe(true);
  });

  it("only lets the system confirm a payment", () => {
    expect(allow("pending_payment", "placed", "system").ok).toBe(true);
    expect(allow("pending_payment", "placed", "customer").ok).toBe(false);
    expect(allow("pending_payment", "placed", "staff").ok).toBe(false);
  });

  it("lets nothing move out of a terminal status", () => {
    for (const from of ["completed", "cancelled", "rejected", "expired"] as OrderStatus[]) {
      expect(isTerminal(from)).toBe(true);
      for (const to of ORDER_STATUSES) {
        for (const actor of ["customer", "staff", "admin", "system"] as const) {
          expect(allow(from, to, actor).ok, `${from} → ${to} as ${actor}`).toBe(false);
        }
      }
    }
  });

  it("lists what the kitchen can do next", () => {
    expect(nextStatuses("placed", "staff", "collection").sort())
      .toEqual(["accepted", "rejected"]);
    expect(nextStatuses("preparing", "staff", "collection")).toEqual(["ready"]);
    expect(nextStatuses("preparing", "staff", "delivery")).toEqual(["out_for_delivery"]);
    expect(nextStatuses("completed", "staff", "collection")).toEqual([]);
  });

  it("gives the customer a delivery-aware timeline", () => {
    expect(customerTimeline("collection").at(-1)!.status).toBe("ready");
    expect(customerTimeline("delivery").at(-1)!.status).toBe("out_for_delivery");
    expect(customerTimeline("collection")).toHaveLength(4);
  });

  it("has no transition into a status that does not exist", () => {
    for (const t of TRANSITIONS) {
      expect(ORDER_STATUSES).toContain(t.from);
      expect(ORDER_STATUSES).toContain(t.to);
      expect(t.actors.length).toBeGreaterThan(0);
    }
  });

  it("gives every non-terminal status a way out", () => {
    for (const status of ORDER_STATUSES) {
      if (isTerminal(status)) continue;
      const out = TRANSITIONS.filter((t) => t.from === status);
      expect(out.length, `${status} is a dead end`).toBeGreaterThan(0);
    }
  });
});
