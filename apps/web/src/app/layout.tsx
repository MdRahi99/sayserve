import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SayServe — say it, we serve it",
  description:
    "Order a takeaway by tapping, typing or speaking. Halal certified, collection and local delivery.",
};

export const viewport: Viewport = { themeColor: "#EFEEE9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2
                                   focus:bg-card focus:px-4 focus:py-2 focus:rounded">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t border-line px-4 lg:px-8 py-5 text-xs text-ink-muted">
          Halal certified · Allergen information on every item · Prices come from the live menu
        </footer>
      </body>
    </html>
  );
}
