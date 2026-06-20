import Link from "next/link";
import { ArrowRight, Coins, FileCheck2, ReceiptText } from "lucide-react";
import { RomanBustRelief } from "@/components/roman-bust-relief";

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
      <section className="roman-hero border-b border-marble/10">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.98fr_1.02fr] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-bronze">
              Patronus · Fontes · Merces
            </p>
            <h1 className="mt-5 font-display text-7xl leading-[0.9] text-cream sm:text-8xl lg:text-9xl">
              Mecenas
            </h1>
            <p className="roman-inscription mt-5 max-w-2xl text-2xl leading-tight text-marble sm:text-3xl">
              Scholarly agents that pay their sources.
            </p>
            <p className="mt-7 max-w-2xl font-display text-3xl leading-tight text-cream sm:text-4xl">
              A Roman-style evidence ledger where AI agents buy what they cite.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Ask a research question. Mecenas discovers relevant sources, buys the evidence it needs with
              USDC nanopayments, and returns an answer with citations, receipts, and a visible budget trail.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/ask"
                className="roman-button inline-flex items-center gap-2 bg-gold px-5 py-3 font-mono text-sm font-semibold uppercase text-ink transition hover:bg-gold-soft"
              >
                Ask Mecenas <ArrowRight size={16} />
              </Link>
              <Link
                href="/sources/new"
                className="roman-button inline-flex items-center gap-2 border border-marble/12 bg-panel px-5 py-3 font-mono text-sm uppercase text-cream transition hover:border-gold/50"
              >
                Register a Source
              </Link>
              <Link
                href="/leaderboard"
                className="roman-button inline-flex items-center gap-2 border border-marble/12 px-5 py-3 font-mono text-sm uppercase text-muted transition hover:text-cream"
              >
                View Live Payments
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-2 border border-marble/10 font-mono text-xs uppercase text-muted sm:grid-cols-4">
              <div className="border-b border-r border-marble/10 p-4 sm:border-b-0">
                <span className="block text-dim">Forma</span>
                <span className="mt-2 block text-cream">Agentica</span>
              </div>
              <div className="border-b border-marble/10 p-4 sm:border-b-0 sm:border-r">
                <span className="block text-dim">Moneta</span>
                <span className="mt-2 block text-cream">USDC</span>
              </div>
              <div className="border-r border-marble/10 p-4">
                <span className="block text-dim">Via</span>
                <span className="mt-2 block text-cream">x402</span>
              </div>
              <div className="p-4">
                <span className="block text-dim">Finis</span>
                <span className="mt-2 block text-cream">Receipts</span>
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div className="roman-panel p-5">
              <RomanBustRelief />
            </div>
            <div className="roman-panel p-5">
              <div className="flex items-center justify-between border-b border-marble/10 pb-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-bronze">tabula rationum</p>
                  <h2 className="mt-1 font-display text-3xl text-cream">Research Budget Ledger</h2>
                </div>
                <div className="coin-surface h-14 w-14 rounded-full ring-1 ring-bronze/60" />
              </div>
              <div className="mt-5 space-y-3">
                {heroStats.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border border-marble/10 bg-ink-2 px-4 py-3">
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{label}</span>
                    <span className="font-mono text-sm text-gold">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="border border-marble/10 bg-panel-2 p-4">
                  <Coins className="text-gold" size={20} />
                  <p className="mt-3 font-mono text-[11px] uppercase text-muted">402 requested</p>
                </div>
                <div className="border border-marble/10 bg-panel-2 p-4">
                  <FileCheck2 className="text-success" size={20} />
                  <p className="mt-3 font-mono text-[11px] uppercase text-muted">evidence unlocked</p>
                </div>
                <div className="border border-marble/10 bg-panel-2 p-4">
                  <ReceiptText className="text-gold" size={20} />
                  <p className="mt-3 font-mono text-[11px] uppercase text-muted">receipt saved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 border-y border-marble/10 py-12 lg:grid-cols-2">
          <h2 className="font-display text-4xl text-cream">
            Most AI research tools cite sources after using them.
          </h2>
          <div className="border-l border-bronze/50 pl-6">
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
