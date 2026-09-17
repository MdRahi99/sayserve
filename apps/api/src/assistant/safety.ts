/**
 * The safety gate.
 *
 * The only stage in the pipeline allowed to refuse a message. It is plain
 * regex on purpose: a rule that can be read, tested and argued about beats a
 * model's opinion when the job is "never let this through".
 *
 * The hard part is not catching attacks. It is not catching customers. Every
 * rule here has to survive the must-pass list in the tests, which is full of
 * things real people say — "is anything half price today?", "collect at 1800",
 * "I'll pay cash". fronter's rules refused all three.
 */

export type SafetyVerdict =
  | { allowed: true }
  | { allowed: false; rule: string; reason: string; reply: string };

type Rule = {
  name: string;
  test: RegExp;
  reason: string;
  /** What the customer sees. Never explains the rule — that is a tutorial. */
  reply: string;
};

const RULES: Rule[] = [
  {
    name: "instruction_override",
    // "ignore what you were told", "forget your instructions", "new rules:"
    test: /\b(ignore|disregard|forget|override)\b[^.?!]{0,30}\b(previous|prior|earlier|above|your|all)\b[^.?!]{0,20}\b(instruction|rule|prompt|direction|constraint)/i,
    reason: "Attempt to override the assistant's instructions.",
    reply: "I can only help with the menu and your order. What would you like?",
  },
  {
    name: "role_hijack",
    // "you are now a...", "act as a...", "pretend you are..."
    test: /\b(you are now|act as|pretend (to be|you)|roleplay as|from now on you)\b/i,
    reason: "Attempt to change the assistant's role.",
    reply: "I only take food orders here. What can I get you?",
  },
  {
    name: "prompt_disclosure",
    test: /\b(system prompt|your (instructions|prompt|rules)|reveal|repeat everything above|print your)\b[^.?!]{0,24}\b(prompt|instruction|rule|config)/i,
    reason: "Attempt to extract the system prompt.",
    reply: "I can't share that. Shall we get your order sorted?",
  },
  {
    name: "price_override",
    // An imperative about price: "make it free", "set the price to 0", "charge me £1".
    // Deliberately NOT triggered by a question about prices or offers.
    test: /\b(make|set|change|update)\b[^.?!]{0,24}\b(price|total|cost|bill)\b[^.?!]{0,16}\b(to|at|as)?\s*(0|zero|free|nothing|£?\s*0)/i,
    reason: "Attempt to set a price.",
    reply: "Prices come from the menu, so I can't change them. Anything else I can add?",
  },
  {
    name: "free_demand",
    // "give me a free burger", "I want it for free" — but not "is the sauce free?"
    test: /\b(give|get|want|need|make|send)\b[^.?!]{0,20}\bfor free\b|\bfree of charge\b[^.?!]{0,12}\b(please|now)\b/i,
    reason: "Demand for free items.",
    reply: "I can't give items away, but I can tell you what's on offer. What would you like?",
  },
  {
    name: "payment_bypass",
    test: /\b(don't|do not|no need to|skip)\b[^.?!]{0,16}\b(charge|pay|payment|bill)\b/i,
    reason: "Attempt to bypass payment.",
    reply: "Payment is handled at checkout. What can I add to your order?",
  },
  {
    name: "staff_impersonation",
    test: /\b(i am|i'm|this is)\b[^.?!]{0,16}\b(the )?(manager|owner|admin|administrator|developer|staff)\b[^.?!]{0,24}\b(so|therefore|give|make|free|discount|change)/i,
    reason: "Claim of staff authority to obtain a change.",
    reply: "Staff changes happen on the staff system, not here. Can I take an order?",
  },
];

/**
 * Absurd quantities, checked numerically rather than by pattern.
 *
 * A digit rule like \d{2,} is what refuses "collect at 1800". Reading the
 * number and comparing it to a threshold refuses "500 burgers" and lets the
 * time through.
 */
const QUANTITY_LIMIT = 100;

function absurdQuantity(message: string): number | null {
  // Only numbers that actually sit in front of something orderable.
  const pattern = /\b(\d{2,6})\s*(?:x\s*)?(?=[a-z])/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(message)) !== null) {
    const value = Number(match[1]);
    const after = message.slice(match.index + match[0].length, match.index + match[0].length + 12);
    // "1800" in "collect at 1800" is followed by nothing orderable; skip times.
    if (/^(hrs|hours|h\b|:|am|pm|pls|please)/i.test(after)) continue;
    if (value > QUANTITY_LIMIT) return value;
  }
  return null;
}

export function checkSafety(message: string): SafetyVerdict {
  const text = message.trim();

  for (const rule of RULES) {
    if (rule.test.test(text)) {
      return { allowed: false, rule: rule.name, reason: rule.reason, reply: rule.reply };
    }
  }

  const quantity = absurdQuantity(text);
  if (quantity !== null) {
    return {
      allowed: false,
      rule: "absurd_quantity",
      reason: `Quantity of ${quantity} exceeds the limit of ${QUANTITY_LIMIT}.`,
      reply: `${quantity} is more than we can take online. For large orders please call the shop.`,
    };
  }

  return { allowed: true };
}

export const SAFETY_RULE_NAMES = [...RULES.map((r) => r.name), "absurd_quantity"];
