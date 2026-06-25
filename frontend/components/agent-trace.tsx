import type { ScoredSource, TraceEvent } from "@/types";

export function AgentTrace({ events, scoredSources }: { events: TraceEvent[]; scoredSources?: ScoredSource[] }) {
  return (
    <div className="space-y-4">
      <div className="roman-panel p-5">
        <h2 className="font-display text-3xl text-cream">Agent Decision Trace</h2>
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <div key={event.id} className="border border-marble/10 bg-ink-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">{event.phase}</p>
                <span className="font-mono text-[11px] uppercase text-muted">{event.status}</span>
              </div>
              <h3 className="mt-2 font-display text-xl text-cream">{event.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{event.detail}</p>
            </div>
          ))}
        </div>
      </div>
      {scoredSources ? (
        <div className="roman-panel p-5">
          <h2 className="font-display text-3xl text-cream">Source Scores</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse font-mono text-xs">
              <thead className="text-left uppercase text-dim">
                <tr>
                  <th className="border-b border-white/10 py-3 pr-4">Source</th>
                  <th className="border-b border-white/10 py-3 pr-4">Rel</th>
                  <th className="border-b border-white/10 py-3 pr-4">Fit</th>
                  <th className="border-b border-white/10 py-3 pr-4">Novel</th>
                  <th className="border-b border-white/10 py-3 pr-4">Price</th>
                  <th className="border-b border-white/10 py-3 pr-4">Final</th>
                </tr>
              </thead>
              <tbody>
                {scoredSources.map((source) => (
                  <tr key={source.sourceId} className="text-muted">
                    <td className="border-b border-white/8 py-3 pr-4 text-cream">{source.title}</td>
                    <td className="border-b border-white/8 py-3 pr-4">{source.relevanceScore}</td>
                    <td className="border-b border-white/8 py-3 pr-4">{source.evidenceFitScore}</td>
                    <td className="border-b border-white/8 py-3 pr-4">{source.noveltyScore}</td>
                    <td className="border-b border-white/8 py-3 pr-4">{source.priceEfficiencyScore}</td>
                    <td className="border-b border-white/8 py-3 pr-4 text-gold">{source.finalScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
