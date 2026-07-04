import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ShareAnswerButton } from "@/components/share-answer-button";
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
  const fundingLabel = answer.paymentType === "user_paid" ? "Patron-funded research" : "Maecenas grant";
  const paymentLabel = trace.paymentMode === "mock" ? "Test treasury" : "Settled treasury";

  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-cream">
            <ArrowLeft size={14} /> Start another commission
          </Link>
          <ShareAnswerButton answerId={id} prompt={answer.prompt} />
        </div>

        <header className="mx-auto mt-10 max-w-4xl text-center">
          <div className="flex flex-wrap justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
            <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-1 text-gold">{fundingLabel}</span>
            <span className="rounded-md border border-marble/15 px-2 py-1 text-muted">{paymentLabel}</span>
          </div>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Research brief</p>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] text-cream sm:text-6xl">{answer.prompt}</h1>
        </header>

        <div className="roman-panel mt-10 overflow-hidden p-4 sm:p-5">
          <BudgetMeter
            budgetUSDC={answer.budgetUSDC}
            spentUSDC={answer.spentUSDC}
            considered={trace.candidates.length}
            purchased={trace.receipts.length}
            skipped={trace.budgetDecision.skippedSources.length}
          />
        </div>

        <article className="roman-panel mx-auto mt-5 max-w-4xl p-6 sm:p-10">
          {content ? (
            <>
              <p className="font-display text-2xl leading-9 text-marble sm:text-3xl">{content.summary}</p>
              <div className="mt-10 space-y-8">
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
                            className="rounded-md border border-marble/15 px-2 py-1 font-mono text-[10px] text-marble hover:border-gold/50"
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
                  <h2 className="font-mono text-xs uppercase text-muted">Research caveats</h2>
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

        <section className="roman-panel mx-auto mt-5 max-w-4xl p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">Source record</p>
          <h2 className="mt-2 font-display text-2xl text-cream">Funded evidence</h2>
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
                    Inspect source <ExternalLink size={13} />
                  </a>
                </div>
              ) : null;
            })}
          </div>
        </section>

        <details className="roman-panel mx-auto mt-5 max-w-4xl p-6 sm:p-8">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em] text-muted hover:text-cream">
            Open the research ledger
          </summary>
          <div className="mt-7 space-y-10">
            <section>
              <h2 className="mb-4 font-display text-2xl text-cream">Selection trace</h2>
              <AgentTrace events={trace.events} scoredSources={trace.scoredSources} />
            </section>
            <section>
              <h2 className="font-display text-2xl text-cream">Passed over</h2>
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
              <h2 className="font-display text-2xl text-cream">Treasury records</h2>
              <div className="mt-4 divide-y divide-marble/10">
                {trace.receipts.map((receipt) => (
                  <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="text-cream">{receipt.sourceTitle}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        {receipt.status === "mock" ? "Test record" : receipt.status} · {receipt.amountUSDC} USDC
                      </p>
                    </div>
                    <Link href={`/receipts/${receipt.id}`} className="font-mono text-xs text-gold">
                      Open record
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </details>
      </div>
    </main>
  );
}
