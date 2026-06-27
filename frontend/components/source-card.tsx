import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Source } from "@/types";
import { apiUrl } from "@/api";

export function SourceCard({ source }: { source: Source }) {
  const previewUrl = apiUrl(`/api/sources/${source.id}/preview`);

  return (
    <article className="roman-panel p-5">
      <div className="flex items-start justify-between gap-4">
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
