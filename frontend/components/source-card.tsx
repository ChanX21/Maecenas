import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Source } from "@/types";
import { apiUrl } from "@/api";

export function SourceCard({ source }: { source: Source }) {
  const previewUrl = apiUrl(`/api/sources/${source.id}/preview`);

  return (
    <article className="roman-panel p-5 relative overflow-hidden group hover:shadow-[0_20px_60px_rgba(227,231,226,0.08)] transition-shadow duration-500">
      <div className="absolute inset-0 bg-marble/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div>
          <h2 className="font-display text-2xl text-cream">{source.title}</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-muted">{source.authorName}</p>
        </div>
        <span className="whitespace-nowrap rounded-sm border border-gold/30 bg-gold/10 px-2 py-1 font-mono text-xs text-gold">
          {source.citationPriceUSDC} USDC / evidence
        </span>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">{source.abstract}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {source.tags.map((tag) => (
          <span key={tag} className="border border-white/10 bg-ink-2 px-2 py-1 font-mono text-[11px] uppercase text-dim">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4 font-mono text-xs">
        <Link href={previewUrl} className="text-gold hover:text-gold-soft">
          Preview endpoint
        </Link>
        <Link href={source.sourceUrl} className="inline-flex items-center gap-1 text-muted hover:text-cream">
          Canonical <ExternalLink size={13} />
        </Link>
      </div>
    </article>
  );
}
