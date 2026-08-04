export const runtime = "edge";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Instrument_Serif, IBM_Plex_Mono, Inter } from "next/font/google";
import { SessionStatus } from "@/components/session-status";
import { AppWalletProvider } from "@/components/wallet/dynamic-provider";
import { WalletButton } from "@/components/wallet/wallet-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maecenas | Research Funding Protocol",
  description: "Fund rigorous research. Reward the evidence behind it.",
  icons: {
    icon: "/icon.png",
  },
  other: {
    "talentapp:project_verification": "15b33bdb1cbbefaa7060742fd498bd0083025f38ecd94ce54ff72ae1eb33d2058eed8de5027cd546f1cf868e0edfb3e7632e14c4ae4f9e5810c75073be1388b5",
  },
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
  { href: "/agents", label: "Agents" },
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
              <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:flex sm:flex-wrap sm:justify-between sm:px-6 sm:py-3 lg:px-8">
                <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <Image 
                    src="/icon.png" 
                    alt="Maecenas Logo" 
                    width={44} 
                    height={44} 
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11"
                  />
                  <span>
                    <span className="roman-inscription block text-xl leading-5 text-cream font-serif italic">Maecenas</span>
                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-marble/70 sm:block">
                      research funding protocol
                    </span>
                  </span>
                </Link>
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <SessionStatus />
                  <WalletButton />
                </div>
                <nav className="order-3 col-span-2 grid w-full grid-cols-5 items-center border-t border-marble/10 pt-1.5 font-mono text-[10px] uppercase text-muted sm:order-none sm:flex sm:w-auto sm:gap-1 sm:border-0 sm:pt-0 sm:text-[11px]">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-h-11 items-center justify-center px-1 text-center transition hover:bg-marble/10 hover:text-cream sm:min-h-0 sm:px-4 sm:py-2"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </header>
            {children}
            <footer className="border-t border-marble/10 mt-16">
              <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
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
