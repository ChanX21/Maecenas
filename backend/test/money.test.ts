import assert from "node:assert/strict";
import test from "node:test";
import { basisPointShare, microsToUSDC, parseUSDCMicros } from "@/utils/money";
import { allocateBudget } from "@/agent/budget-allocator";
import type { ScoredSource } from "@/types";

test("allocates 70% of a five-cent search to evidence", () => {
  assert.equal(microsToUSDC(basisPointShare(parseUSDCMicros("0.05"), 7000)), "0.035");
});

test("evidence selection fits exact decimal boundaries and rejects invalid money", () => {
  const sources: ScoredSource[] = ["0.1", "0.2", "0.000001"].map((priceUSDC, index) => ({
    sourceId: `source-${index}`, title: "Evidence", authorName: "Author", preview: "Preview",
    tags: [`topic-${index}`], priceUSDC, walletAddress: "0x1111111111111111111111111111111111111111",
    relevanceScore: 95, evidenceFitScore: 95, noveltyScore: 95, priceEfficiencyScore: 95,
    finalScore: 95, reason: "Relevant"
  }));
  const decision = allocateBudget(sources, "0.3", "balanced");
  assert.deepEqual(decision.selectedSources.map((source) => source.sourceId), ["source-0", "source-1"]);
  assert.equal(decision.estimatedSpendUSDC, "0.3");
  assert.equal(decision.skippedSources.length, 1);
  assert.throws(() => allocateBudget(sources, "NaN", "balanced"), /USDC amount/);
  assert.throws(() => allocateBudget([{ ...sources[0], priceUSDC: "-1" }], "1", "balanced"), /USDC amount/);
});
