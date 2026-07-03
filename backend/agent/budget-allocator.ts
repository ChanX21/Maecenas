import type { BudgetDecision, ResearchStrategy, ScoredSource } from "@/types";
import { formatUSDC, parseUSDC } from "@/utils/money";

const thresholds: Record<ResearchStrategy, number> = {
  conservative: 82,
  balanced: 74,
  aggressive: 68
};

const maxPurchases: Record<ResearchStrategy, number> = {
  conservative: 3,
  balanced: 4,
  aggressive: 6
};

export function allocateBudget(
  scoredSources: ScoredSource[],
  maxBudgetUSDC: string,
  strategy: ResearchStrategy
): BudgetDecision {
  const budget = parseUSDC(maxBudgetUSDC);
  const threshold = thresholds[strategy];
  const selected: BudgetDecision["selectedSources"] = [];
  const skipped: BudgetDecision["skippedSources"] = [];
  const selectedTags = new Set<string>();
  let spend = 0;

  for (const source of scoredSources) {
    const price = parseUSDC(source.priceUSDC);
    const addsDiversity = source.tags.some((tag) => !selectedTags.has(tag));
    const canAfford = spend + price <= budget;
    const underCap = selected.length < maxPurchases[strategy];

    if (source.finalScore >= threshold && canAfford && underCap && (addsDiversity || selected.length < 2)) {
      selected.push({
        sourceId: source.sourceId,
        title: source.title,
        priceUSDC: source.priceUSDC,
        reason: `${source.reason} Final score ${source.finalScore}; adds ${source.tags.slice(0, 3).join(", ")} evidence.`
      });
      spend += price;
      source.tags.forEach((tag) => selectedTags.add(tag));
    } else {
      const reason = !canAfford
        ? "Passed over because funding it would exceed the treasury limit."
        : !underCap
          ? "Passed over because the commission already funded enough diverse evidence."
          : source.finalScore < threshold
            ? `Passed over because final score ${source.finalScore} is below the ${threshold} ${strategy} threshold.`
            : "Passed over because funded sources already cover the same evidence need.";
      skipped.push({
        sourceId: source.sourceId,
        title: source.title,
        priceUSDC: source.priceUSDC,
        reason
      });
    }
  }

  return {
    maxBudgetUSDC,
    selectedSources: selected,
    skippedSources: skipped,
    estimatedSpendUSDC: formatUSDC(spend)
  };
}
