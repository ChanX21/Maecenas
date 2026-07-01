import type { Metadata } from "next";
import Link from "next/link";
import { Instrument_Serif, IBM_Plex_Mono, Inter } from "next/font/google";
import { SessionStatus } from "@/components/session-status";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maecenas",
  description: "Scholarly agents that pay their sources."
};

const serif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const navItems = [
  { href: "/ask", label: "Ask" },
  { href: "/sources", label: "Sources" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <body className="font-sans">
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-marble/10 bg-ink/88 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <span className="coin-surface flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-ink shadow-gold ring-1 ring-marble/40">
                  M
                </span>
                <span>
                  <span className="roman-inscription block text-xl leading-5 text-cream font-serif italic">Maecenas</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-marble/70">
                    autonomous research ledger
                  </span>
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <SessionStatus />
              </div>
              <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-marble/10 pt-2 font-mono text-[11px] uppercase text-muted sm:order-none sm:w-auto sm:border-0 sm:pt-0">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 transition hover:bg-marble/10 hover:text-cream"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
