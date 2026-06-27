import type { CandidateSource, Source } from "@/types";

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function scoutSources(question: string, sources: Source[]): CandidateSource[] {
  const queryTokens = new Set(tokenize(question));

  return sources
    .map((source) => {
      const searchable = `${source.title} ${source.abstract} ${source.tags.join(" ")} ${source.evidenceText.slice(0, 280)}`;
      const matches = tokenize(searchable).filter((token) => queryTokens.has(token)).length;
      return { source, matches };
    })
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 20)
    .map(({ source }) => ({
      sourceId: source.id,
      title: source.title,
      authorName: source.authorName,
      preview: source.abstract,
      tags: source.tags,
      priceUSDC: source.citationPriceUSDC,
      walletAddress: source.walletAddress
    }));
}
