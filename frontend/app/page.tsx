import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ResearchPromptBox } from "@/components/research-prompt-box";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase text-gold">Research workspace</p>
        <h1 className="mt-4 font-display text-5xl text-cream sm:text-6xl">Maecenas</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Evidence-grounded answers with transparent research budgets and source-owner receipts.
        </p>
      </header>

      <section className="mt-10 max-w-5xl">
        <ResearchPromptBox />
      </section>

      <section className="mt-12 grid gap-8 border-t border-marble/10 pt-8 md:grid-cols-3">
        <Status label="Access" value="5 sponsored answers" detail="Wallet remains hidden until the free quota is used." />
        <Status label="Evidence" value="Approved sources only" detail="Every cited source is selected before synthesis." />
        <Status label="Payments" value="Mock settlement" detail="Receipts are explicit test records until real x402 is enabled." />
      </section>

      <nav className="mt-10 flex flex-wrap gap-5 border-t border-marble/10 pt-6 font-mono text-xs uppercase text-muted">
        <Link href="/sources" className="inline-flex items-center gap-1 hover:text-cream">
          Browse approved sources <ArrowUpRight size={13} />
        </Link>
        <Link href="/sources/new" className="inline-flex items-center gap-1 hover:text-cream">
          Submit evidence <ArrowUpRight size={13} />
        </Link>
        <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-cream">
          Source-owner dashboard <ArrowUpRight size={13} />
        </Link>
      </nav>
    </main>
  );
}

function Status({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase text-dim">{label}</p>
      <p className="mt-2 text-base text-cream">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}
