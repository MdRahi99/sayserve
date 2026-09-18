import { DemoBanner } from "@/components/DemoBanner";
import { OrderPreview } from "@/components/OrderPreview";
import { PopularItems } from "@/components/PopularItems";
import Link from "next/link";

const GITHUB = "https://github.com/MdRahi99/sayserve";
const PORTFOLIO = "https://mdrahi.vercel.app";

/**
 * The landing page.
 *
 * Two kinds of visitor arrive here wanting different things. Someone hungry
 * wants to start ordering, so that is the whole of the first screen. Someone
 * looking at this as a piece of work wants to know how it is built, so that
 * sits further down where it cannot get in a customer's way.
 */
export default function HomePage() {
  return (
    <>
      <section className="px-4 lg:px-8 pt-8 lg:pt-20 pb-12 lg:pb-24 max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div>
            <p className="tag bg-ok-bg text-ok">
              Open until 23:00 · collection 15 min
            </p>

            <h1 className="text-4xl lg:text-6xl font-medium tracking-tight mt-4 leading-[1.05]">
              Say it.
              <br />
              We serve it.
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

            <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-8 text-sm text-ink-soft">
              <li>Halal certified</li>
              <li>Collection or local delivery</li>
              <li>Allergens on every item</li>
            </ul>
          </div>

          <div className="mt-10 lg:mt-0">
            <OrderPreview />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-card">
        <div className="px-4 lg:px-8 py-14 lg:py-20 max-w-6xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-medium">
            Three ways to order. One cart.
          </h2>
          <p className="text-ink-soft mt-3 max-w-xl">
            Whichever you use, the same rules apply: prices come from the menu,
            and anything the assistant adds you can still change by hand.
          </p>

          <div className="grid sm:grid-cols-3 gap-8 mt-10">
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

      <section className="px-4 lg:px-8 py-14 lg:py-20 max-w-6xl mx-auto">
        <h2 className="text-2xl lg:text-3xl font-medium">How it works</h2>
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

      <section className="border-t border-line bg-card">
        <div className="px-4 lg:px-8 py-14 lg:py-20 max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl lg:text-3xl font-medium">
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

      <section className="px-4 lg:px-8 py-14 lg:py-20 max-w-6xl mx-auto">
        <div className="bg-surface rounded-2xl p-8 lg:p-12">
          <h2 className="text-2xl lg:text-3xl font-medium">
            Have a look at both sides
          </h2>
          <p className="text-ink-soft mt-3 max-w-lg">
            One press puts you in as a customer, or behind the counter on the
            kitchen board with orders already coming in.
          </p>
          <DemoBanner bare />
        </div>
      </section>

      <section className="border-t border-line bg-card">
        <div className="px-4 lg:px-8 py-14 lg:py-20 max-w-6xl mx-auto">
          <p className="text-xs tracking-wide uppercase text-ink-muted">
            About this project
          </p>
          <h2 className="text-2xl lg:text-3xl font-medium mt-2">
            Most orders never reach a language model
          </h2>
          <p className="text-ink-soft mt-4 max-w-2xl">
            “Two cheeseburgers and a large coke” is not a language problem. It
            is a quantity, an item and a size, in a sentence people have used at
            counters for decades. SayServe reads that directly, in about ten
            milliseconds, for nothing. The model is the fallback for the messy
            ones, and even then it only proposes a cart: the server prices it,
            checks it against the live menu, and owns the order.
          </p>

          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
            <Stat
              value="100%"
              label="of test orders finished without a model call"
            />
            <Stat value="~11 ms" label="slowest deterministic case" />
            <Stat value="29" label="hand-written eval cases, run in CI" />
            <Stat value="0" label="items the assistant can invent, by design" />
          </dl>

          <p className="text-sm text-ink-soft mt-10 max-w-2xl">
            Built with Next.js, Node, Express, MongoDB, Socket.io and Stripe.
            The pricing engine, the order state machine and the assistant are
            all tested on every push.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <a
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-5"
            >
              Code on GitHub
            </a>
            <a
              href={PORTFOLIO}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-5"
            >
              More of my work
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-sm text-ink-soft mt-2">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li>
      <span className="w-8 h-8 rounded-full bg-ink text-white grid place-items-center text-sm">
        {n}
      </span>
      <h3 className="text-base font-medium mt-3">{title}</h3>
      <p className="text-sm text-ink-soft mt-1.5">{body}</p>
    </li>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block text-3xl font-medium">{value}</span>
        <span className="block text-xs text-ink-soft mt-2">{label}</span>
      </dd>
    </div>
  );
}
