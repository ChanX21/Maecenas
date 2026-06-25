import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Brain, Coins, FileCheck2, ReceiptText, SearchCheck } from "lucide-react";
import { ResearchPromptBox } from "@/components/research-prompt-box";

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
        <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-marble/70">
              Autonomous scholarly payment agent
            </p>
            <h1 className="mt-5 font-display text-6xl leading-[0.9] text-cream sm:text-8xl lg:text-9xl">
              Mecenas
            </h1>
            <p className="roman-inscription mx-auto mt-5 max-w-3xl text-2xl leading-tight text-marble sm:text-3xl">
              Scholarly agents that pay their sources.
            </p>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted">
              Ask a research question. Mecenas plans the work, searches registered evidence endpoints,
              decides what is worth buying, pays in USDC, then answers with citations and receipts.
            </p>
          </div>

          <div className="marble-aura mx-auto mt-9 w-full max-w-5xl">
            <ResearchPromptBox />
          </div>

          <div className="mx-auto mt-6 grid w-full max-w-5xl gap-3 md:grid-cols-4">
            <AgentStep icon={<Brain size={18} />} title="Plans" detail="Breaks the prompt into evidence needs." />
            <AgentStep icon={<SearchCheck size={18} />} title="Scores" detail="Ranks source fit, novelty, and price." />
            <AgentStep icon={<Coins size={18} />} title="Pays" detail="Handles 402 challenges and USDC proofs." />
            <AgentStep icon={<ReceiptText size={18} />} title="Receipts" detail="Records paid citation evidence." />
          </div>

          <div className="mx-auto mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/sources/new"
              className="roman-button inline-flex items-center gap-2 border border-marble/12 bg-panel px-5 py-3 font-mono text-sm uppercase text-cream transition hover:border-marble/40"
            >
              Register a Source
            </Link>
            <Link
              href="/leaderboard"
              className="roman-button inline-flex items-center gap-2 border border-marble/12 px-5 py-3 font-mono text-sm uppercase text-muted transition hover:text-cream"
            >
              View Live Payments
            </Link>
            <Link
              href="/ask"
              className="roman-button inline-flex items-center gap-2 bg-marble px-5 py-3 font-mono text-sm font-semibold uppercase text-ink transition hover:bg-cream"
            >
              Full Ask Page <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mx-auto mt-10 grid w-full max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="roman-panel p-5">
              <div className="flex items-center justify-between border-b border-marble/10 pb-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-marble/70">budget ledger</p>
                  <h2 className="mt-1 font-display text-3xl text-cream">Live Research Trail</h2>
                </div>
                <div className="marble-seal flex h-14 w-14 items-center justify-center rounded-full font-display text-xl text-ink">
                  M
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {heroStats.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border border-marble/10 bg-ink-2 px-4 py-3">
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{label}</span>
                    <span className="font-mono text-sm text-marble">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="roman-panel p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-marble/70">autonomous sequence</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="border border-marble/10 bg-panel-2 p-4">
                  <Coins className="text-marble" size={20} />
                  <p className="mt-3 font-mono text-[11px] uppercase text-muted">402 requested</p>
                </div>
                <div className="border border-marble/10 bg-panel-2 p-4">
                  <FileCheck2 className="text-success" size={20} />
                  <p className="mt-3 font-mono text-[11px] uppercase text-muted">evidence unlocked</p>
                </div>
                <div className="border border-marble/10 bg-panel-2 p-4">
                  <ReceiptText className="text-marble" size={20} />
                  <p className="mt-3 font-mono text-[11px] uppercase text-muted">receipt saved</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted">
                The agent does not buy everything. It compares sources, skips weak evidence, spends from a fixed
                research budget, and exposes a structured decision trace on every answer.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 border-y border-marble/10 py-12 lg:grid-cols-2">
          <h2 className="font-display text-4xl text-cream">
            Most AI research tools cite sources after using them.
          </h2>
          <div className="border-l border-marble/30 pl-6">
            <p className="font-display text-4xl text-marble">Mecenas pays sources before using them.</p>
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

function AgentStep({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="border border-marble/10 bg-panel/80 p-4">
      <div className="flex items-center gap-3">
        <span className="text-marble">{icon}</span>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-cream">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}
