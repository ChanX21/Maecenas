import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AgentTrace } from "@/components/agent-trace";
import { BudgetMeter } from "@/components/budget-meter";
import { getAnswer, getSources } from "@/api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnswerPage({ params }: PageProps) {
  const { id } = await params;
  const [{ answer }, { sources }] = await Promise.all([getAnswer(id).catch(() => ({ answer: null })), getSources()]);
  if (!answer) notFound();
  const trace = answer.decisionTraceJson;
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const content = answer.contentJson;
  const fundingLabel = answer.paymentType === "user_paid" ? "User-funded research" : "Sponsored research";
  const paymentLabel = trace.paymentMode === "mock" ? "Mock evidence payments" : "Settled evidence payments";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase text-muted hover:text-cream">
        <ArrowLeft size={14} /> Ask another question
      </Link>

      <header className="mt-8 border-b border-marble/10 pb-8">
        <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase">
          <span className="border border-gold/30 bg-gold/10 px-2 py-1 text-gold">{fundingLabel}</span>
          <span className="border border-marble/15 px-2 py-1 text-muted">{paymentLabel}</span>
        </div>
        <h1 className="mt-5 max-w-4xl font-display text-4xl leading-tight text-cream sm:text-5xl">{answer.prompt}</h1>
      </header>

      <div className="mt-6">
        <BudgetMeter
          budgetUSDC={answer.budgetUSDC}
          spentUSDC={answer.spentUSDC}
          considered={trace.candidates.length}
          purchased={trace.receipts.length}
          skipped={trace.budgetDecision.skippedSources.length}
        />
      </div>

      <article className="mt-10">
        {content ? (
          <>
            <p className="text-xl leading-9 text-marble">{content.summary}</p>
            <div className="mt-10 space-y-10">
              {content.sections.map((section, index) => (
                <section key={`${section.heading}-${index}`} className="border-t border-marble/10 pt-7">
                  <h2 className="font-display text-2xl text-cream">{section.heading}</h2>
                  <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-muted">{section.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.citations.map((sourceId) => {
                      const source = sourceById.get(sourceId);
                      return source ? (
                        <a
                          key={sourceId}
                          href={`#citation-${sourceId}`}
                          className="border border-marble/15 px-2 py-1 font-mono text-[11px] text-marble hover:border-gold/50"
                        >
                          {source.title}
                        </a>
                      ) : null;
                    })}
                  </div>
                </section>
              ))}
            </div>
            {content.limitations.length ? (
              <section className="mt-10 border-l-2 border-gold/40 pl-5">
                <h2 className="font-mono text-xs uppercase text-muted">Limitations</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                  {content.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <div className="whitespace-pre-wrap text-base leading-8 text-muted">{answer.response}</div>
        )}
      </article>

      <section className="mt-12 border-t border-marble/10 pt-8">
        <h2 className="font-display text-2xl text-cream">Sources</h2>
        <div className="mt-5 divide-y divide-marble/10">
          {answer.citedSourceIds.map((sourceId) => {
            const source = sourceById.get(sourceId);
            return source ? (
              <div key={source.id} id={`citation-${source.id}`} className="flex flex-col gap-3 py-5 sm:flex-row sm:justify-between">
                <div>
                  <h3 className="text-base text-cream">{source.title}</h3>
                  <p className="mt-1 text-sm text-muted">{source.authorName}</p>
                </div>
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-gold"
                >
                  Open source <ExternalLink size={13} />
                </a>
              </div>
            ) : null;
          })}
        </div>
      </section>

      <details className="mt-10 border-t border-marble/10 pt-6">
        <summary className="cursor-pointer font-mono text-xs uppercase text-muted hover:text-cream">
          Research details and receipts
        </summary>
        <div className="mt-7 space-y-10">
          <section>
            <h2 className="mb-4 font-display text-2xl text-cream">Decision trace</h2>
            <AgentTrace events={trace.events} scoredSources={trace.scoredSources} />
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">Not selected</h2>
            <div className="mt-4 divide-y divide-marble/10">
              {trace.budgetDecision.skippedSources.map((source) => (
                <div key={source.sourceId} className="py-3">
                  <p className="text-sm text-cream">{source.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{source.reason}</p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-display text-2xl text-cream">Evidence receipts</h2>
            <div className="mt-4 divide-y divide-marble/10">
              {trace.receipts.map((receipt) => (
                <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="text-cream">{receipt.sourceTitle}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {receipt.status === "mock" ? "Mock proof" : receipt.status} · {receipt.amountUSDC} USDC
                    </p>
                  </div>
                  <Link href={`/receipts/${receipt.id}`} className="font-mono text-xs text-gold">
                    View receipt
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>
    </main>
  );
}
