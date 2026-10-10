import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Source } from "@/types";
import { apiUrl } from "@/api";

export function SourceCard({ source }: { source: Source }) {
  const previewUrl = apiUrl(`/api/sources/${source.id}/preview`);

  return (
    <article className="roman-panel flex h-full flex-col overflow-hidden p-6 transition-colors hover:border-gold/25">
      <div className="relative z-10">
        <div>
          <h2 className="text-base font-medium leading-6 text-cream">{source.title}</h2>
          <p className="mt-2 text-xs leading-5 text-muted">{source.authorName}</p>
        </div>
        <span className="mt-4 inline-flex whitespace-nowrap rounded-md bg-gold/10 px-2 py-1 text-[11px] text-gold">
          {source.citationPriceUSDC} USDC / unlock
        </span>
      </div>
      <p className="mt-4 line-clamp-4 flex-1 text-sm leading-6 text-muted">{source.abstract}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {source.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-marble/5 px-2 py-1 text-[11px] text-muted">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-marble/10 pt-4 text-xs">
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
