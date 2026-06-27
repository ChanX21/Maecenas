import type { ScoredSource, TraceEvent } from "@/types";

export function AgentTrace({ events, scoredSources }: { events: TraceEvent[]; scoredSources?: ScoredSource[] }) {
  return (
    <div className="space-y-8">
      <ol className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="grid gap-1 border-b border-marble/10 pb-3 sm:grid-cols-[140px_1fr]">
            <span className="font-mono text-[11px] uppercase text-muted">{event.phase}</span>
            <div>
              <p className="text-sm text-cream">{event.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{event.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {scoredSources?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse font-mono text-xs">
            <thead className="text-left uppercase text-dim">
              <tr>
                <th className="border-b border-marble/10 py-3 pr-4">Source</th>
                <th className="border-b border-marble/10 py-3 pr-4">Relevance</th>
                <th className="border-b border-marble/10 py-3 pr-4">Fit</th>
                <th className="border-b border-marble/10 py-3 pr-4">Final</th>
              </tr>
            </thead>
            <tbody>
              {scoredSources.map((source) => (
                <tr key={source.sourceId} className="text-muted">
                  <td className="border-b border-marble/10 py-3 pr-4 text-cream">{source.title}</td>
                  <td className="border-b border-marble/10 py-3 pr-4">{source.relevanceScore}</td>
                  <td className="border-b border-marble/10 py-3 pr-4">{source.evidenceFitScore}</td>
                  <td className="border-b border-marble/10 py-3 pr-4 text-gold">{source.finalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
