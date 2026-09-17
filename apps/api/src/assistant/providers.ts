/**
 * The two outside services, behind small interfaces.
 *
 * Both are optional. With no keys configured the assistant still runs: the
 * safety gate, the parser and fuzzy matching are all local, and they handle
 * most orders. The providers add meaning-matching and conversation, not the
 * ability to take an order.
 *
 * The interfaces also let the eval harness run with no network and no keys,
 * which is why CI can score the pipeline on every push.
 */
import { env } from "../config/env.js";
import type { EmbeddingProvider } from "./menuSearch.js";
import type { ModelClient } from "./pipeline.js";
import type { CartLineInput } from "../lib/pricing.js";

// ------------------------------------------------------------------ embeddings

export function createEmbeddingProvider(): EmbeddingProvider | null {
  if (!env.VOYAGE_API_KEY) return null;

  return {
    name: `voyage:${env.VOYAGE_MODEL}`,
    async embed(texts) {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({ model: env.VOYAGE_MODEL, input: texts, input_type: "document" }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Voyage returned ${res.status}`);
      const body = (await res.json()) as { data: { embedding: number[]; index: number }[] };
      return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}

// ----------------------------------------------------------------------- model

const SYSTEM = `You take food orders for a takeaway called SayServe.

You are given the menu items that might be relevant, the cart as it stands, and
the customer's message. Reply with JSON only, in this exact shape:

{"lines":[{"slug":"...","quantity":1,"choices":{"group-id":["Option name"]}}],"reply":"one short sentence"}

Rules:
- "lines" is the WHOLE cart as it should be after this message, not a change to it.
- Use only slugs, group ids and option names given to you. Never invent one.
- Never mention or decide a price. Prices are added afterwards.
- If a required choice is missing, leave it out. A question is asked for you.
- If the customer asks a question rather than ordering, keep "lines" as it was
  and answer in "reply", in one short sentence.
- No markdown, no backticks, no text outside the JSON.`;

export function createModelClient(): ModelClient | null {
  if (!env.GROQ_API_KEY) return null;

  return {
    name: `groq:${env.GROQ_MODEL}`,
    async proposeCart({ message, currentLines, menuExcerpt, history }) {
      const context = [
        "Menu items you may use:",
        ...menuExcerpt.map((i) =>
          `- ${i.slug} "${i.name}"${i.options.length ? `\n    options: ${i.options.join("; ")}` : ""}`),
        "",
        `Cart as it stands: ${JSON.stringify(currentLines)}`,
      ].join("\n");

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          temperature: 0,
          max_tokens: 700,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "system", content: context },
            ...history.slice(-6),
            { role: "user", content: message },
          ],
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) throw new Error(`Groq returned ${res.status}`);
      const body = (await res.json()) as { choices: { message: { content: string } }[] };
      const raw = body.choices[0]?.message?.content;
      if (!raw) return null;

      // A model that returns nonsense must not take the site down with it.
      try {
        const parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim()) as {
          lines?: unknown;
          reply?: unknown;
        };
        const lines = Array.isArray(parsed.lines)
          ? (parsed.lines.filter(isLine) as CartLineInput[])
          : [];
        return { lines, reply: typeof parsed.reply === "string" ? parsed.reply : undefined };
      } catch {
        return null;
      }
    },
  };
}

function isLine(value: unknown): value is CartLineInput {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return typeof line.slug === "string" && typeof line.quantity === "number";
}
