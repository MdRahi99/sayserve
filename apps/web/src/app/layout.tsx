import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SayServe — say it, we serve it",
  description:
    "Order a takeaway by tapping, typing or speaking. Halal certified, collection and local delivery.",
};

export const viewport: Viewport = {
  themeColor: "#EFEEE9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2
                                   focus:bg-card focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1 pb-14 lg:pb-0">
          {children}
        </main>
        <footer className="border-t border-line">
          <div
            className="max-w-7xl mx-auto px-4 lg:px-8 py-8 pb-24 lg:pb-8
                          flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <p className="text-xs text-ink-muted">
              Halal certified · Allergens on every item · Prices come from the
              live menu
            </p>
            <p className="text-xs text-ink-muted">
              Built by{" "}
              <a
                href="https://mdrahi.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-ink-soft hover:text-brand-600"
              >
                Md Forhad Hossain Rahi
              </a>{" "}
              ·{" "}
              <a
                href="https://github.com/MdRahi99/sayserve"
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-600"
              >
                Code on GitHub
              </a>
            </p>
          </div>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
