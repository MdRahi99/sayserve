import Link from "next/link";
import { DemoBanner } from "@/components/DemoBanner";

export default function HomePage() {
  return (
    <div className="px-4 lg:px-8 py-10 lg:py-16 max-w-6xl mx-auto">
      <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
        <img
          src="/hero.svg" alt=""
          className="rounded-2xl w-full h-56 lg:h-96 object-cover order-2 lg:order-1"
        />
        <div className="order-1 lg:order-2 mb-8 lg:mb-0">
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight">Say it. We serve it.</h1>
          <p className="text-ink-soft mt-4 text-base lg:text-lg">
            Tap through the menu, or just type what you want. Both fill the same cart.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ink-soft">
            <li>Halal certified, with allergens on every item</li>
            <li>Collection in about 15 minutes, or local delivery</li>
            <li>Prices always come from the live menu, never from a guess</li>
          </ul>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/chat" className="btn-primary px-6">Just tell us what you want</Link>
            <Link href="/menu" className="btn-ghost px-6">Browse the menu</Link>
          </div>

          <DemoBanner />
        </div>
      </div>
    </div>
  );
}
