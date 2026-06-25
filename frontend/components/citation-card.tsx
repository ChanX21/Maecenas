import type { Source } from "@/types";

export function CitationCard({ source }: { source: Source }) {
  return (
    <article className="border border-white/10 bg-ink-2 p-4">
      <h3 className="font-display text-xl text-cream">{source.title}</h3>
      <p className="mt-1 font-mono text-xs uppercase text-muted">{source.authorName}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{source.abstract}</p>
    </article>
  );
}
