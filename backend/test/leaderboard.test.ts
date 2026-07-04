import assert from "node:assert/strict";
import test from "node:test";
import { buildLeaderboard } from "@/analytics/leaderboard";
import type {
  Answer,
  CitationPayment,
  MaecenasDatabase,
  SearchPayment,
  Source
} from "@/types";

const ownerA = "0x1111111111111111111111111111111111111111";
const ownerB = "0x2222222222222222222222222222222222222222";

function source(id: string, walletAddress: string): Source {
  return {
    id,
    title: `Source ${id}`,
    authorName: `Author ${id}`,
    sourceUrl: `https://example.com/${id}`,
    walletAddress,
    citationPriceUSDC: "0.0001",
    abstract: "A sufficiently descriptive source abstract for analytics tests.",
    evidenceText: "Evidence content used only by the analytics test fixture.",
    tags: ["analytics"],
    status: "approved",
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

function answer(id: string): Answer {
  return {
    id,
    prompt: `Question ${id}`,
    response: `Answer ${id}`,
    budgetUSDC: "0.01",
    spentUSDC: "0.0001",
    citedSourceIds: [],
    decisionTraceJson: {
      plan: {
        userQuestion: `Question ${id}`,
        subquestions: [],
        evidenceNeeds: [],
        maxBudgetUSDC: "0.01",
        strategy: "balanced"
      },
      candidates: [],
      scoredSources: [],
      budgetDecision: {
        maxBudgetUSDC: "0.01",
        selectedSources: [],
        skippedSources: [],
        estimatedSpendUSDC: "0"
      },
      receipts: [],
      events: [],
      paymentMode: "mock"
    },
    paymentType: "free_sponsored",
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

function receipt(
  id: string,
  answerId: string,
  sourceId: string,
  recipientWallet: string,
  status: CitationPayment["status"],
  amountUSDC: string
): CitationPayment {
  return {
    id,
    answerId,
    sourceId,
    sourceTitle: `Source ${sourceId}`,
    userPrompt: "Test question",
    amountUSDC,
    paymentId: `${status}_${id}`,
    payerAgent: "Maecenas Scholar v1",
    payerWallet: "0x3333333333333333333333333333333333333333",
    recipientWallet,
    status,
    fundedBy: "maecenas_sponsored",
    receiptSignature: `signature_${id}`,
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

function searchPayment(
  id: string,
  status: SearchPayment["status"],
  usedForAnswerId?: string
): SearchPayment {
  return {
    id,
    paymentIntentId: `intent_${id}`,
    sessionId: `session_${id}`,
    walletAddress: ownerA,
    amountUSDC: "0.01",
    status,
    paymentMode: status === "paid" ? "real" : "mock",
    createdAt: "2026-01-01T00:00:00.000Z",
    usedForAnswerId
  };
}

const database: MaecenasDatabase = {
  sources: [source("source_a", ownerA), source("source_b", ownerB)],
  answers: [answer("answer_mock"), answer("answer_real")],
  receipts: [
    receipt("receipt_mock", "answer_mock", "source_a", ownerA, "mock", "0.0001"),
    receipt("receipt_paid", "answer_real", "source_b", ownerB, "paid", "0.0002"),
    receipt("receipt_failed", "answer_real", "source_a", ownerA, "failed", "0.5"),
    receipt("receipt_pending", "answer_real", "source_a", ownerA, "pending", "0.5")
  ],
  userUsages: [],
  searchPaymentIntents: [],
  searchPayments: [
    searchPayment("search_mock", "mock", "answer_mock"),
    searchPayment("search_real", "paid", "answer_real"),
    searchPayment("search_failed", "failed")
  ]
};

test("mock leaderboard includes only completed mock records", () => {
  const leaderboard = buildLeaderboard(database, "mock");

  assert.equal(leaderboard.paymentMode, "mock");
  assert.equal(leaderboard.metrics.fundedCommissions, 1);
  assert.equal(leaderboard.metrics.paidEvidenceUnlocks, 1);
  assert.equal(leaderboard.metrics.contributorsRewarded, 1);
  assert.equal(leaderboard.metrics.totalUSDCDistributed, "0.0001");
  assert.equal(leaderboard.metrics.paidSearchRevenueUSDC, "0.01");
  assert.deepEqual(
    leaderboard.recentPaymentStream.map((item) => item.id),
    ["receipt_mock"]
  );
});

test("real leaderboard excludes mock, failed, and pending records", () => {
  const leaderboard = buildLeaderboard(database, "real");

  assert.equal(leaderboard.paymentMode, "real");
  assert.equal(leaderboard.metrics.fundedCommissions, 1);
  assert.equal(leaderboard.metrics.paidEvidenceUnlocks, 1);
  assert.equal(leaderboard.metrics.contributorsRewarded, 1);
  assert.equal(leaderboard.metrics.totalUSDCDistributed, "0.0002");
  assert.equal(leaderboard.metrics.paidSearchRevenueUSDC, "0.01");
  assert.deepEqual(
    leaderboard.recentPaymentStream.map((item) => item.id),
    ["receipt_paid"]
  );
  assert.deepEqual(
    leaderboard.topEarningSources.map((item) => item.sourceId),
    ["source_b"]
  );
});
