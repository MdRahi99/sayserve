import { DemoBanner } from "@/components/DemoBanner";
import { OrderPreview } from "@/components/OrderPreview";
import { PopularItems } from "@/components/PopularItems";
import { WakeApi } from "@/components/WakeApi";
import Link from "next/link";

/**
 * The landing page.
 *
 * A shop front, not a project page. Someone arriving here is hungry: the first
 * screen is for starting an order, and everything below answers "how does this
 * work" rather than "how was this built". The credit and the repo link live in
 * the footer, where a curious visitor can find them and a hungry one will not
 * trip over them.
 */
export default function HomePage() {
  return (
    <>
      <WakeApi />

      <section className="bg-warm-glow">
        <div
          className="px-4 lg:px-8 pt-10 lg:pt-20 pb-14 lg:pb-24 max-w-7xl mx-auto
                        lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center"
        >
          <div className="animate-rise">
            <p className="tag bg-ok-bg text-ok gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" aria-hidden />
              Open until 23:00 · collection 15 min
            </p>

            <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight mt-5 leading-[0.98]">
              Say it.
              <br />
              <span className="text-brand">We serve it.</span>
            </h1>

            <p className="text-ink-soft mt-5 text-base lg:text-lg max-w-md">
              Tap through the menu, type what you want, or just say it out loud.
              All three fill the same cart.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link href="/chat" className="btn-primary px-6">
                Just tell us what you want
              </Link>
              <Link href="/menu" className="btn-ghost px-6">
                Browse the menu
              </Link>
            </div>

            <ul className="flex flex-wrap gap-2 mt-8">
              {[
                "Halal certified",
                "Collection or delivery",
                "Allergens listed",
              ].map((t) => (
                <li
                  key={t}
                  className="tag bg-card border border-line text-ink-soft"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 lg:mt-0 animate-rise">
            <OrderPreview />
          </div>
        </div>
      </section>

      <section className="bg-card border-y border-line">
        <div className="px-4 lg:px-8 py-14 lg:py-20 max-w-7xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Three ways to order. <span className="text-brand">One cart.</span>
          </h2>
          <p className="text-ink-soft mt-3 max-w-xl">
            Whichever you use, the same rules apply: prices come from the menu,
            and anything the assistant adds you can still change by hand.
          </p>

          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            <Feature
              title="Tap"
              body="Browse by category, pick your size and add-ons, take the onions off. The price updates as you go."
            />
            <Feature
              title="Type"
              body="“Two cheeseburgers, no onions, and a large coke.” It lands in the cart, and you watch it happen."
            />
            <Feature
              title="Speak"
              body="Hold the mic and say it. The words appear in the box first, so a misheard one gets fixed, not ordered."
            />
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-8 py-14 lg:py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
          <Step
            n="1"
            title="Order"
            body="Tap, type or talk. Add what you like and change your mind as often as you want."
          />
          <Step
            n="2"
            title="Checkout"
            body="Collection or delivery, card or pay at the counter. No account needed."
          />
          <Step
            n="3"
            title="Watch"
            body="The kitchen accepts it and your page moves on its own. No refreshing."
          />
          <Step
            n="4"
            title="Collect"
            body="Come in when it says ready. Order the same again next time in one tap."
          />
        </ol>
      </section>

      <section className="section-tint border-y border-line">
        <div className="px-4 lg:px-8 py-14 lg:py-20 max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">
              Popular right now
            </h2>
            <Link href="/menu" className="text-sm text-accent hover:underline">
              See the whole menu
            </Link>
          </div>
          <div className="mt-8">
            <PopularItems />
          </div>
        </div>
      </section>

      <section className="px-4 lg:px-8 py-14 lg:py-24 max-w-7xl mx-auto">
        <div className="bg-brand-fade rounded-3xl p-8 lg:p-14 text-white shadow-lift">
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Have a look at both sides
          </h2>
          <p className="mt-3 max-w-lg text-white/90">
            One press puts you in as a customer, or behind the counter on the
            kitchen board with orders already coming in.
          </p>
          <DemoBanner bare />
        </div>
      </section>
    </>
  );
}

const FEATURE_TONE: Record<string, string> = {
  Tap: "bg-brand-50 text-brand-600",
  Type: "bg-accent-bg text-accent",
  Speak: "bg-sun-bg text-warn",
};

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-hover p-6">
      <span
        className={`tag ${FEATURE_TONE[title] ?? "bg-surface text-ink-soft"} text-xs px-3 py-1`}
      >
        {title}
      </span>
      <p className="text-sm text-ink-soft mt-4 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="relative">
      <span
        className="w-10 h-10 rounded-2xl bg-brand-fade text-white grid place-items-center
                       text-sm font-semibold shadow-soft"
      >
        {n}
      </span>
      <h3 className="text-base font-semibold mt-4">{title}</h3>
      <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{body}</p>
    </li>
  );
}
