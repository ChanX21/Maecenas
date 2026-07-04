import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Instrument_Serif, IBM_Plex_Mono, Inter } from "next/font/google";
import iconImg from "./icon.png";
import { SessionStatus } from "@/components/session-status";
import { AppWalletProvider } from "@/components/wallet/dynamic-provider";
import { WalletButton } from "@/components/wallet/wallet-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maecenas | Research Funding Protocol",
  description: "Fund rigorous research. Reward the evidence behind it."
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
  { href: "/ask", label: "Research" },
  { href: "/sources", label: "Archive" },
  { href: "/dashboard", label: "Treasury" },
  { href: "/leaderboard", label: "Ledger" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable} ${sans.variable}`}>
      <body className="font-sans">
        <AppWalletProvider>
          <div className="min-h-screen">
            <header className="sticky top-0 z-40 border-b border-marble/10 bg-ink/88 backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-3">
                  <Image 
                    src={iconImg} 
                    alt="Maecenas Logo" 
                    width={44} 
                    height={44} 
                    unoptimized
                    className="h-11 w-11 shrink-0 rounded-full object-cover" 
                  />
                  <span>
                    <span className="roman-inscription block text-xl leading-5 text-cream font-serif italic">Maecenas</span>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-marble/70">
                      research funding protocol
                    </span>
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <SessionStatus />
                  <WalletButton />
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
            <footer className="border-t border-marble/10 mt-16">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                  © {new Date().getFullYear()} Maecenas · Research Funding Protocol
                </p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-marble/10 bg-ink-2 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                    Built on Arc
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-gold/20 bg-gold/5 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-gold">
                    Powered by Circle
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </AppWalletProvider>
      </body>
    </html>
  );
}
