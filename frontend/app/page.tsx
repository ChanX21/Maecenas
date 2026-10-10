import Link from "next/link";
import { ArrowUpRight, BookOpen, ScanLine, Sparkles } from "lucide-react";
import { ResearchPromptBox } from "@/components/research-prompt-box";
import { LiveLedgerMetrics, LiveLedgerStream } from "@/components/live-ledger";

export default function HomePage() {
  return (
    <main className="research-home">
      <section className="research-start" aria-labelledby="research-heading">
        <div className="research-emblem" aria-hidden="true">
          <span><BookOpen size={21} strokeWidth={1.4} /></span>
          <span><Sparkles size={25} strokeWidth={1.3} /></span>
          <span><ScanLine size={21} strokeWidth={1.4} /></span>
        </div>
        <h1 id="research-heading" className="font-serif text-[2.3rem] leading-[1.15] tracking-[-0.02em] text-cream sm:text-[2.75rem]">Where will your curiosity take you?</h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-muted">Ask a question. Fund the best evidence.<br className="hidden sm:block" /> Get an answer you can follow back to its source.</p>
        <div className="mt-9 text-left sm:mt-10"><ResearchPromptBox /></div>
      </section>

      <section className="research-activity" aria-label="Research activity">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-sm text-cream">Research with a paper trail</p><p className="mt-1 text-xs text-muted">See where the evidence leads, and who it rewards.</p></div>
          <Link href="/leaderboard" className="flex shrink-0 items-center gap-1 text-xs text-muted hover:text-gold">Public ledger <ArrowUpRight size={14} /></Link>
        </div>
        <details className="mt-5 rounded-2xl border border-marble/[0.08] bg-panel/40">
          <summary className="cursor-pointer px-5 py-4 text-xs text-muted">Explore network activity</summary>
          <div className="grid grid-cols-2 border-t border-marble/[0.08] lg:grid-cols-4"><LiveLedgerMetrics /></div>
          <div className="px-5 pb-2"><LiveLedgerStream /></div>
        </details>
        <p className="mt-6 text-center text-[11px] leading-6 text-dim">Built for questions worth asking. Designed to credit the people behind the answers.</p>
      </section>
    </main>
  );
}
