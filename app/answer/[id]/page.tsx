import { notFound } from "next/navigation";
import { AgentTrace } from "@/frontend/components/agent-trace";
import { BudgetMeter } from "@/frontend/components/budget-meter";
import { PaymentReceiptCard } from "@/frontend/components/payment-receipt-card";
import { SectionHeading } from "@/frontend/components/ui/section-heading";
import { getAnswer, getSources } from "@/frontend/api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnswerPage({ params }: PageProps) {
  const { id } = await params;
  const [{ answer }, { sources }] = await Promise.all([getAnswer(id).catch(() => ({ answer: null })), getSources()]);
  if (!answer) notFound();
  const trace = answer.decisionTraceJson;
  const citedSources = sources.filter((source) => answer.citedSourceIds.includes(source.id));

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Generated answer"
        title={answer.prompt}
        copy={`This answer used ${trace.receipts.length} paid evidence sources and ${trace.budgetDecision.skippedSources.length} skipped-source explanations.`}
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <section className="space-y-6">
          <BudgetMeter
            budgetUSDC={answer.budgetUSDC}
            spentUSDC={answer.spentUSDC}
            considered={trace.candidates.length}
            purchased={trace.receipts.length}
            skipped={trace.budgetDecision.skippedSources.length}
          />
          <article className="roman-panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-gold">Final answer</p>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-cream">{answer.response}</div>
          </article>
          <section className="roman-panel p-5">
            <h2 className="font-display text-3xl text-cream">Citations</h2>
            <div className="mt-5 space-y-3">
              {citedSources.map((source) => (
                <div key={source.id} className="border border-marble/10 bg-ink-2 p-4">
                  <h3 className="font-display text-xl text-cream">{source.title}</h3>
                  <p className="mt-1 font-mono text-xs uppercase text-muted">
                    {source.authorName} · {source.citationPriceUSDC} USDC
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="roman-panel p-5">
            <h2 className="font-display text-3xl text-cream">Skipped Sources</h2>
            <div className="mt-5 space-y-3">
              {trace.budgetDecision.skippedSources.map((source) => (
                <div key={source.sourceId} className="border border-marble/10 bg-ink-2 p-4">
                  <h3 className="font-display text-xl text-cream">{source.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{source.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </section>
        <aside className="space-y-6">
          <AgentTrace events={trace.events} scoredSources={trace.scoredSources} />
          <section className="space-y-4">
            {trace.receipts.map((receipt) => (
              <PaymentReceiptCard key={receipt.id} receipt={receipt} />
            ))}
          </section>
        </aside>
      </div>
    </main>
  );
}
