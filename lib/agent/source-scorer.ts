import type { CandidateSource, ResearchPlan, ScoredSource } from "@/lib/types";
import { parseUSDC } from "@/lib/utils/money";

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function boundedScore(value: number): number {
  return Math.max(35, Math.min(99, Math.round(value)));
}

export function scoreSources(plan: ResearchPlan, candidates: CandidateSource[]): ScoredSource[] {
  const questionTokens = new Set(tokenize(plan.userQuestion));
  const needTokens = new Set(tokenize(plan.evidenceNeeds.join(" ")));

  return candidates
    .map((candidate, index) => {
      const textTokens = tokenize(`${candidate.title} ${candidate.preview} ${candidate.tags.join(" ")}`);
      const questionMatches = textTokens.filter((token) => questionTokens.has(token)).length;
      const needMatches = textTokens.filter((token) => needTokens.has(token)).length;
      const topicalBoost = candidate.tags.some((tag) => ["x402", "gateway", "nanopayments", "agents", "usdc"].includes(tag))
        ? 12
        : 0;
      const relevanceScore = boundedScore(58 + questionMatches * 8 + topicalBoost);
      const evidenceFitScore = boundedScore(54 + needMatches * 7 + (candidate.preview.length > 120 ? 8 : 0));
      const noveltyScore = boundedScore(84 - index * 3 + new Set(candidate.tags).size * 2);
      const price = parseUSDC(candidate.priceUSDC);
      const priceEfficiencyScore = boundedScore(price <= 0.0002 ? 96 : price <= 0.0005 ? 82 : price <= 0.001 ? 64 : 42);
      const finalScore = Math.round(
        relevanceScore * 0.45 + evidenceFitScore * 0.25 + noveltyScore * 0.15 + priceEfficiencyScore * 0.15
      );

      return {
        ...candidate,
        relevanceScore,
        evidenceFitScore,
        noveltyScore,
        priceEfficiencyScore,
        finalScore,
        reason:
          finalScore >= 82
            ? "Strong match for the question and efficient enough to buy under the research budget."
            : finalScore >= 70
              ? "Useful supporting context, but lower priority than the strongest evidence."
              : "Weak or expensive fit for this prompt compared with available alternatives."
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
