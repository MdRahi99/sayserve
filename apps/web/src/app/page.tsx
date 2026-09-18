import Link from "next/link";
import { DemoBanner } from "@/components/DemoBanner";
import { PopularItems } from "@/components/PopularItems";

/**
 * Two layouts from the wireframes, not one stretched.
 *
 * On a phone: the name, whether the shop is open, one big thing to press, and
 * the popular items — because a hungry person on a phone wants to start, not
 * read. On a desktop there is room for the pitch beside the picture.
 */
export default function HomePage() {
  return (
    <div className="px-4 lg:px-8 py-6 lg:py-16 max-w-6xl mx-auto">
      {/* Phone */}
      <div className="lg:hidden">
        <h1 className="text-2xl font-medium">SayServe</h1>
        <p className="tag bg-ok-bg text-ok mt-2">Open until 23:00 · collection 15 min</p>

        <div className="bg-surface rounded-2xl h-44 mt-4 flex items-end p-5" aria-hidden>
          <p className="text-lg font-medium">Say it. We serve it.</p>
        </div>

        <Link href="/chat" className="btn-primary w-full mt-5 h-13 py-3">
          Just tell us what you want
        </Link>
        <p className="text-center text-sm text-ink-soft mt-3">
          or <Link href="/menu" className="underline">browse the menu</Link>
        </p>

        <h2 className="text-base font-medium mt-8 mb-1">Popular right now</h2>
        <PopularItems />

        <DemoBanner />
      </div>

      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
        <div className="bg-surface rounded-2xl h-96" aria-hidden />
        <div>
          <h1 className="text-5xl font-medium tracking-tight">Say it. We serve it.</h1>
          <p className="text-ink-soft mt-4 text-lg">
            Type or speak your order, or browse the menu.
          </p>
          <p className="text-ink-soft">Halal certified · collection in 15 minutes.</p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/chat" className="btn-primary px-6">Just tell us what you want</Link>
            <Link href="/menu" className="btn-ghost px-6">Browse the menu</Link>
          </div>

          <ul className="mt-8 space-y-2 text-sm text-ink-soft">
            <li>Collection or delivery</li>
            <li>Order again in one tap</li>
            <li>Allergens on every item</li>
          </ul>

          <DemoBanner />
        </div>
      </div>

      <div className="hidden lg:block mt-14">
        <h2 className="text-lg font-medium mb-3">Popular right now</h2>
        <PopularItems />
      </div>
    </div>
  );
}
