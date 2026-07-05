import Link from "next/link";
import {
  BookOpenCheck,
  CircleDollarSign,
  FileCheck2,
  Landmark,
  Scale,
  SearchCheck,
  UsersRound,
  ArrowUpRight
} from "lucide-react";
import { ResearchPromptBox } from "@/components/research-prompt-box";
import { LiveLedgerMetrics, LiveLedgerStream } from "@/components/live-ledger";

export default function HomePage() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">The research funding protocol</p>
        <h1 className="mt-5 font-display text-5xl leading-[0.98] text-cream sm:text-7xl">
          Fund the question.
          <span className="gleam mt-2 block font-serif italic">Reward the evidence.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          Commission rigorous research from curated sources. Every evidence unlock is funded, cited, and recorded.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-5xl">
        <ResearchPromptBox />
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl overflow-hidden rounded-xl border border-marble/10 bg-panel/65 sm:grid-cols-2 lg:grid-cols-4">
        <LiveLedgerMetrics />
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="roman-panel p-5 sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">How it works</p>
          <div className="mt-6 space-y-6">
            <Step icon={<SearchCheck size={17} />} number="I" title="Set the mandate" copy="Ask a focused question and define the treasury limit." />
            <Step icon={<Scale size={17} />} number="II" title="Evidence competes" copy="Maecenas ranks approved sources for relevance, fit, and value." />
            <Step icon={<FileCheck2 size={17} />} number="III" title="Receive the brief" copy="Get a cited answer with an auditable selection and funding trail." />
          </div>
        </article>

        <article className="roman-panel p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Live research ledger</p>
            <Link href="/leaderboard" className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-muted hover:text-cream">
              View ledger <ArrowUpRight size={12} />
            </Link>
          </div>
          <LiveLedgerStream />
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl overflow-hidden rounded-xl border border-marble/10 bg-panel/65 sm:grid-cols-2 lg:grid-cols-4">
        <Pillar icon={<BookOpenCheck size={17} />} title="Curated archive" copy="Only approved sources enter synthesis." />
        <Pillar icon={<Landmark size={17} />} title="Transparent treasury" copy="Every funded unlock creates a record." />
        <Pillar icon={<UsersRound size={17} />} title="Patron-funded" copy="Capital activates research worth doing." />
        <Pillar icon={<CircleDollarSign size={17} />} title="Evidence-first" copy="Useful sources earn value and attribution." />
      </section>
    </main>
  );
}

function Step({ icon, number, title, copy }: { icon: React.ReactNode; number: string; title: string; copy: string }) {
  return (
    <div className="grid grid-cols-[36px_24px_1fr] items-start gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-marble/10 bg-marble/5 text-gold">{icon}</span>
      <span className="pt-1 font-serif text-xl italic text-gold">{number}</span>
      <div>
        <h2 className="text-sm text-cream">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted">{copy}</p>
      </div>
    </div>
  );
}

function Pillar({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="flex gap-3 border-b border-marble/10 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r lg:last:border-r-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">{icon}</span>
      <div>
        <h2 className="text-sm text-cream">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted">{copy}</p>
      </div>
    </div>
  );
}
