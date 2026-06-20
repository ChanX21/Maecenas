import Link from "next/link";
import { ArrowRight, Coins, FileCheck2, ReceiptText } from "lucide-react";

const heroStats = [
  ["Research Budget", "0.01 USDC"],
  ["Sources Found", "7"],
  ["Sources Bought", "3"],
  ["Sources Skipped", "4"],
  ["Total Spent", "0.0008 USDC"]
];

export default function HomePage() {
  return (
    <main>
      <section className="terminal-grid border-b border-white/10">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-gold">
              Scholarly payment terminal
            </p>
            <h1 className="mt-5 font-display text-6xl leading-[0.95] text-cream sm:text-7xl lg:text-8xl">
              Mecenas
            </h1>
            <p className="mt-6 max-w-2xl font-display text-3xl leading-tight text-cream sm:text-4xl">
              Scholarly agents that pay their sources.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Ask a research question. Mecenas discovers relevant sources, buys the evidence it needs with
              USDC nanopayments, and returns an answer with citations, receipts, and a visible budget trail.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/ask"
                className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-3 font-mono text-sm font-semibold uppercase text-ink transition hover:bg-gold-soft"
              >
                Ask Mecenas <ArrowRight size={16} />
              </Link>
              <Link
                href="/sources/new"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-panel px-5 py-3 font-mono text-sm uppercase text-cream transition hover:border-gold/50"
              >
                Register a Source
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 px-5 py-3 font-mono text-sm uppercase text-muted transition hover:text-cream"
              >
                View Live Payments
              </Link>
            </div>
          </div>
          <div className="border border-white/10 bg-panel/90 p-5 shadow-gold">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">agent trace</p>
                <h2 className="mt-1 font-display text-3xl text-cream">Research Budget Ledger</h2>
              </div>
              <div className="coin-surface h-14 w-14 rounded-full" />
            </div>
            <div className="mt-5 space-y-3">
              {heroStats.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border border-white/8 bg-ink-2 px-4 py-3">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{label}</span>
                  <span className="font-mono text-sm text-gold">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="border border-white/8 bg-panel-2 p-4">
                <Coins className="text-gold" size={20} />
                <p className="mt-3 font-mono text-[11px] uppercase text-muted">402 requested</p>
              </div>
              <div className="border border-white/8 bg-panel-2 p-4">
                <FileCheck2 className="text-success" size={20} />
                <p className="mt-3 font-mono text-[11px] uppercase text-muted">evidence unlocked</p>
              </div>
              <div className="border border-white/8 bg-panel-2 p-4">
                <ReceiptText className="text-gold" size={20} />
                <p className="mt-3 font-mono text-[11px] uppercase text-muted">receipt saved</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <h2 className="font-display text-4xl text-cream">
            Most AI research tools cite sources after using them.
          </h2>
          <div className="border-l border-gold/40 pl-6">
            <p className="font-display text-4xl text-gold">Mecenas pays sources before using them.</p>
            <p className="mt-4 text-muted">
              It turns scholarly sources into x402-priced evidence endpoints, and gives AI agents a budget
              to buy the most useful evidence before answering.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
