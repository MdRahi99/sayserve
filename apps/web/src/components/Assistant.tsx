"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, type ChatReply, type MenuItem } from "@/lib/api";
import { toQuoteLines, useCart } from "@/lib/cart";
import { useVoice } from "@/lib/useVoice";

type Turn = {
  role: "user" | "assistant";
  text: string;
  route?: string;
  modelCalled?: boolean;
  ms?: number;
};

const SESSION_KEY = "sayserve-chat-session";

/**
 * The assistant, writing into the same cart the menu writes into.
 *
 * That is the whole design in one component: whatever comes back, the customer
 * can still edit it by hand, and nothing here decides a price. The little grey
 * line under each reply shows which route the message took, because an
 * assistant that tells you when it did not need a model is easier to trust
 * than one that never explains itself.
 */
export function Assistant({ items, onClose }: { items: MenuItem[]; onClose?: () => void }) {
  const { lines, replaceAll } = useCart();
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      text: "Tell me what you'd like, in your own words. You can type or hold the mic.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState<{ label: string; value: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const voice = useVoice((text, final) => {
    setInput(text);
    if (final && text) void send(text);
  });

  useEffect(() => {
    sessionId.current = localStorage.getItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    setTurns((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setQuickReplies([]);
    setSending(true);
    setError(null);

    try {
      const reply: ChatReply = await api.chat(message, sessionId.current, toQuoteLines(lines));

      sessionId.current = reply.sessionId;
      localStorage.setItem(SESSION_KEY, reply.sessionId);

      // The assistant's cart becomes the cart. Named lines so the panel can
      // render without a second menu lookup.
      replaceAll(
        reply.lines.map((line) => ({
          slug: line.slug,
          name: items.find((i) => i.slug === line.slug)?.name ?? line.slug,
          quantity: line.quantity,
          choices: line.choices ?? {},
        }))
      );

      setTurns((prev) => [...prev, {
        role: "assistant",
        text: reply.reply,
        route: reply.route,
        modelCalled: reply.telemetry.modelCalled,
        ms: reply.telemetry.ms,
      }]);
      setQuickReplies(reply.quickReplies);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reach the assistant.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
        <h2 className="text-base font-medium">Just tell us</h2>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="text-ink-soft p-1">✕</button>
        )}
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {turns.map((turn, i) => (
          <div key={i}>
            <div className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                turn.role === "user" ? "bg-ink text-white" : "bg-surface"}`}>
                {turn.text}
              </p>
            </div>
            {turn.role === "assistant" && turn.route && (
              <p className="text-[11px] text-ink-muted mt-1 ml-1">
                {turn.modelCalled
                  ? `Understood with the model · ${turn.ms} ms`
                  : turn.route === "refused"
                    ? "Blocked by the safety rules"
                    : `Matched directly · ${turn.ms} ms · no model call`}
              </p>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <p className="bg-surface rounded-2xl px-3.5 py-2 text-sm text-ink-muted">…</p>
          </div>
        )}

        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {quickReplies.map((reply) => (
              <button key={reply.value} onClick={() => void send(reply.value)} className="chip">
                {reply.label}
              </button>
            ))}
          </div>
        )}

        {error && <p role="alert" className="text-xs text-bad">{error}</p>}
        {voice.error && <p role="alert" className="text-xs text-bad">{voice.error}</p>}
      </div>

      <div className="border-t border-line p-3 shrink-0">
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="sr-only">Your message</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send(input)}
              placeholder={voice.listening ? "Listening…" : "Type your order"}
              className="w-full h-11 rounded-lg border border-line px-3 text-sm placeholder:text-ink-muted"
            />
          </label>

          {voice.supported && (
            <button
              onMouseDown={voice.start} onMouseUp={voice.stop}
              onTouchStart={voice.start} onTouchEnd={voice.stop}
              aria-label="Hold to speak"
              aria-pressed={voice.listening}
              className={`w-11 h-11 rounded-lg border grid place-items-center shrink-0 transition
                ${voice.listening ? "bg-bad text-white border-bad" : "border-line-strong"}`}
            >
              <span aria-hidden className="text-lg">{voice.listening ? "◉" : "⏺"}</span>
            </button>
          )}

          <button
            onClick={() => void send(input)} disabled={!input.trim() || sending}
            className="btn-primary w-11 h-11 p-0 shrink-0" aria-label="Send"
          >↑</button>
        </div>

        <p className="text-[11px] text-ink-muted mt-2 text-center">
          {voice.supported
            ? "Hold the mic and speak. Everything lands in your cart, and you can edit it."
            : "Everything lands in your cart, and you can edit it by hand."}
        </p>
      </div>
    </div>
  );
}
