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
  amountUSDC: string,
  fundedBy: CitationPayment["fundedBy"] = "maecenas_sponsored"
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
    fundedBy,
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
    receipt("receipt_paid", "answer_real", "source_b", ownerB, "paid", "0.0002", "user_paid_search"),
    receipt("receipt_failed", "answer_real", "source_a", ownerA, "failed", "0.5"),
    receipt("receipt_pending", "answer_real", "source_a", ownerA, "pending", "0.5")
  ],
  userUsages: [],
  searchPaymentIntents: [],
  searchPayments: [
    searchPayment("search_mock", "mock", "answer_mock"),
    searchPayment("search_real", "paid", "answer_real"),
    searchPayment("search_failed", "failed")
  ],
  researchRuns: [{
    id: "run_real",
    status: "completed",
    paymentType: "user_paid",
    searchPaymentId: "search_real",
    aiInputTokens: 100,
    aiOutputTokens: 50,
    aiCostUSDC: "0.001",
    createdAt: "2026-01-01T00:00:00.000Z"
  }],
  evidencePaymentCosts: [{
    id: "attempt_paid",
    paymentScope: "search_real",
    searchPaymentId: "search_real",
    fundedBy: "user_paid_search",
    sourceId: "source_b",
    amountUSDC: "0.0002",
    status: "paid",
    paymentId: "paid_receipt_paid",
    createdAt: "2026-01-01T00:00:00.000Z"
  }]
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
  assert.equal(leaderboard.metrics.userPaidSourcePayoutsUSDC, "0.0002");
  assert.equal(leaderboard.metrics.grossRetainedUSDC, "0.0098");
  assert.equal(leaderboard.metrics.aiCostUSDC, "0.001");
  assert.equal(leaderboard.metrics.trackedContributionUSDC, "0.0088");
  assert.deepEqual(
    leaderboard.recentPaymentStream.map((item) => item.id),
    ["receipt_paid"]
  );
  assert.deepEqual(
    leaderboard.topEarningSources.map((item) => item.sourceId),
    ["source_b"]
  );
});

test("leaderboard orders completed receipts newest first", () => {
  const older = receipt("receipt_older", "answer_real", "source_a", ownerA, "paid", "0.0001");
  older.createdAt = "2026-01-01T00:00:00.000Z";
  const newer = receipt("receipt_newer", "answer_real", "source_b", ownerB, "paid", "0.0002");
  newer.createdAt = "2026-01-02T00:00:00.000Z";

  const leaderboard = buildLeaderboard({ ...database, receipts: [older, newer] }, "real");

  assert.deepEqual(
    leaderboard.recentPaymentStream.map((item) => item.id),
    ["receipt_newer", "receipt_older"]
  );
});

test("reports unused paid credit and current-month net after configured costs", () => {
  const previous = { ...process.env };
  try {
    process.env.MONTHLY_INFRA_COST_USDC = "0.005";
    process.env.MONTHLY_OTHER_COST_USDC = "0.001";
    const now = new Date().toISOString();
    const completedPayment = searchPayment("search_current", "paid", "answer_real");
    completedPayment.createdAt = now;
    const credit = searchPayment("search_credit", "paid");
    credit.createdAt = now;
    const paidReceipt = receipt("receipt_current", "answer_real", "source_b", ownerB, "paid", "0.0002", "user_paid_search");
    paidReceipt.createdAt = now;
    const result = buildLeaderboard({
      ...database,
      receipts: [paidReceipt],
      searchPayments: [completedPayment, credit],
      evidencePaymentCosts: [{
        id: "attempt_current",
        paymentScope: completedPayment.id,
        searchPaymentId: completedPayment.id,
        fundedBy: "user_paid_search",
        sourceId: "source_b",
        amountUSDC: "0.0002",
        status: "paid",
        createdAt: now
      }],
      researchRuns: [{
        ...database.researchRuns[0],
        searchPaymentId: completedPayment.id,
        aiCostUSDC: "0.001",
        createdAt: now
      }]
    }, "real");

    assert.equal(result.metrics.customerCreditLiabilityUSDC, "0.01");
    assert.equal(result.metrics.monthlyNetUSDC, "0.0028");
  } finally {
    process.env = previous;
  }
});
