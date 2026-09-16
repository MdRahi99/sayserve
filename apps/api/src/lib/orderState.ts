/**
 * Order state machine.
 *
 * Every legal status move in SayServe is defined here and nowhere else. A route
 * asks `canTransition` before it writes; anything not listed is a 409. This is
 * why a bug in a screen, or a stale button on a kitchen tablet, cannot push an
 * order through a step it should not take.
 *
 * Each move also records WHO may make it, so "customer cancels" and "staff
 * rejects" are different transitions even though both end an order.
 */

export const ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
  "rejected",
  "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Actor = "customer" | "staff" | "admin" | "system";
export type Fulfilment = "collection" | "delivery";

type Transition = {
  from: OrderStatus;
  to: OrderStatus;
  actors: Actor[];
  /** Only valid for this fulfilment type, when set. */
  fulfilment?: Fulfilment;
  /** Human sentence for the audit trail and the customer's timeline. */
  label: string;
  /** A paid order moving here must be refunded. */
  refunds?: boolean;
  /** The actor must give a reason. */
  needsReason?: boolean;
};

export const TRANSITIONS: Transition[] = [
  {
    from: "pending_payment", to: "placed", actors: ["system"],
    label: "Payment confirmed",
  },
  {
    from: "pending_payment", to: "expired", actors: ["system"],
    label: "Expired without payment",
  },
  {
    from: "pending_payment", to: "cancelled", actors: ["customer"],
    label: "Cancelled before payment",
  },
  {
    from: "placed", to: "accepted", actors: ["staff", "admin"],
    label: "Accepted by the kitchen",
  },
  {
    from: "placed", to: "rejected", actors: ["staff", "admin"],
    label: "Rejected by the kitchen", refunds: true, needsReason: true,
  },
  {
    from: "placed", to: "cancelled", actors: ["customer"],
    label: "Cancelled by the customer", refunds: true,
  },
  {
    from: "accepted", to: "preparing", actors: ["staff", "admin"],
    label: "Preparing",
  },
  {
    from: "accepted", to: "cancelled", actors: ["admin"],
    label: "Cancelled by the restaurant", refunds: true, needsReason: true,
  },
  {
    from: "preparing", to: "ready", actors: ["staff", "admin"],
    fulfilment: "collection", label: "Ready to collect",
  },
  {
    from: "preparing", to: "out_for_delivery", actors: ["staff", "admin"],
    fulfilment: "delivery", label: "Out for delivery",
  },
  {
    from: "ready", to: "completed", actors: ["staff", "admin"],
    label: "Collected",
  },
  {
    from: "out_for_delivery", to: "completed", actors: ["staff", "admin"],
    label: "Delivered",
  },
];

export const TERMINAL_STATUSES: OrderStatus[] = [
  "completed", "cancelled", "rejected", "expired",
];

export function isTerminal(status: OrderStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export type TransitionCheck =
  | { ok: true; transition: Transition }
  | { ok: false; reason: string; code: "not_allowed" | "wrong_actor" | "needs_reason" };

export function canTransition(args: {
  from: OrderStatus;
  to: OrderStatus;
  actor: Actor;
  fulfilment: Fulfilment;
  reason?: string;
}): TransitionCheck {
  const { from, to, actor, fulfilment, reason } = args;

  const matches = TRANSITIONS.filter(
    (t) => t.from === from && t.to === to &&
      (t.fulfilment === undefined || t.fulfilment === fulfilment)
  );

  if (matches.length === 0) {
    return {
      ok: false, code: "not_allowed",
      reason: `An order cannot move from ${from} to ${to}.`,
    };
  }

  const allowed = matches.find((t) => t.actors.includes(actor));
  if (!allowed) {
    return {
      ok: false, code: "wrong_actor",
      reason: `A ${actor} cannot move an order from ${from} to ${to}.`,
    };
  }

  if (allowed.needsReason && !reason?.trim()) {
    return {
      ok: false, code: "needs_reason",
      reason: `Moving an order to ${to} requires a reason.`,
    };
  }

  return { ok: true, transition: allowed };
}

/** Every status this order could move to next, for the given actor. */
export function nextStatuses(
  from: OrderStatus, actor: Actor, fulfilment: Fulfilment
): OrderStatus[] {
  return TRANSITIONS
    .filter((t) =>
      t.from === from &&
      t.actors.includes(actor) &&
      (t.fulfilment === undefined || t.fulfilment === fulfilment))
    .map((t) => t.to);
}

/** Can the customer still cancel? Only before the kitchen commits to cooking. */
export function customerCanCancel(status: OrderStatus) {
  return nextStatuses(status, "customer", "collection").includes("cancelled");
}

/** The four steps the customer's tracking timeline shows. */
export function customerTimeline(fulfilment: Fulfilment) {
  return [
    { status: "placed" as OrderStatus, label: "Order placed" },
    { status: "accepted" as OrderStatus, label: "Accepted by the kitchen" },
    { status: "preparing" as OrderStatus, label: "Preparing your food" },
    fulfilment === "delivery"
      ? { status: "out_for_delivery" as OrderStatus, label: "Out for delivery" }
      : { status: "ready" as OrderStatus, label: "Ready to collect" },
  ];
}
