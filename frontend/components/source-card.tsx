import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Source } from "@/types";
import { apiUrl } from "@/api";

export function SourceCard({ source }: { source: Source }) {
  const previewUrl = apiUrl(`/api/sources/${source.id}/preview`);

  return (
    <article className="roman-panel group relative flex h-full flex-col overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_20px_60px_rgba(141,216,168,0.08)]">
      <div className="absolute inset-0 bg-marble/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative z-10">
        <div>
          <h2 className="font-display text-2xl text-cream">{source.title}</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-muted">{source.authorName}</p>
        </div>
        <span className="mt-4 inline-flex whitespace-nowrap rounded-md border border-gold/20 bg-gold/10 px-2 py-1 font-mono text-[10px] uppercase text-gold">
          {source.citationPriceUSDC} USDC / unlock
        </span>
      </div>
      <p className="mt-4 line-clamp-4 flex-1 text-sm leading-6 text-muted">{source.abstract}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {source.tags.map((tag) => (
          <span key={tag} className="rounded-md border border-white/10 bg-ink-2 px-2 py-1 font-mono text-[10px] uppercase text-dim">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4 font-mono text-xs">
        <Link href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-soft">
          Inspect record
        </Link>
        <Link href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-cream">
          Visit source <ExternalLink size={13} />
        </Link>
      </div>
    </article>
  );
}
