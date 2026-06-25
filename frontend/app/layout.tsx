import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mecenas",
  description: "Scholarly agents that pay their sources."
};

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
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-marble/10 bg-ink/88 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <span className="coin-surface flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-ink shadow-gold ring-1 ring-marble/40">
                  M
                </span>
                <span>
                  <span className="roman-inscription block text-xl leading-5 text-cream">Mecenas</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-marble/70">
                    autonomous research ledger
                  </span>
                </span>
              </Link>
              <nav className="hidden items-center gap-1 border border-marble/10 bg-panel px-1 py-1 font-mono text-xs uppercase text-muted md:flex">
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
