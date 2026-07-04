import type {
  CitationPayment,
  MaecenasDatabase,
  SearchPayment
} from "@/types";
import { sumUSDC } from "@/utils/money";

export type PaymentMode = "mock" | "real";

function completedStatus(mode: PaymentMode): CitationPayment["status"] {
  return mode === "real" ? "paid" : "mock";
}

function completedSearchPaymentStatus(mode: PaymentMode): SearchPayment["status"] {
  return mode === "real" ? "paid" : "mock";
}

export function completedReceipts(
  receipts: CitationPayment[],
  mode: PaymentMode
): CitationPayment[] {
  const status = completedStatus(mode);
  return receipts.filter((receipt) => receipt.status === status);
}

function completedSearchPayments(
  payments: SearchPayment[],
  mode: PaymentMode
): SearchPayment[] {
  const status = completedSearchPaymentStatus(mode);
  return payments.filter(
    (payment) => payment.status === status && Boolean(payment.usedForAnswerId)
  );
}

export function buildLeaderboard(
  database: MaecenasDatabase,
  paymentMode: PaymentMode
) {
  const receipts = completedReceipts(database.receipts, paymentMode);
  const searchPayments = completedSearchPayments(
    database.searchPayments,
    paymentMode
  );
  const registeredOwners = new Set(
    database.sources.map((source) => source.walletAddress.toLowerCase())
  );
  const rewardedContributors = new Set(
    receipts.map((receipt) => receipt.recipientWallet.toLowerCase())
  );
  const fundedAnswers = new Set(receipts.map((receipt) => receipt.answerId));

  const topEarningSources = database.sources
    .map((source) => {
      const sourceReceipts = receipts.filter(
        (receipt) => receipt.sourceId === source.id
      );
      return {
        sourceId: source.id,
        title: source.title,
        authorName: source.authorName,
        citations: sourceReceipts.length,
        earnedUSDC: sumUSDC(
          sourceReceipts.map((receipt) => receipt.amountUSDC)
        )
      };
    })
    .filter((source) => source.citations > 0)
    .sort((a, b) => Number(b.earnedUSDC) - Number(a.earnedUSDC))
    .slice(0, 8);

  const sourcePayoutsUSDC = sumUSDC(
    receipts.map((receipt) => receipt.amountUSDC)
  );

  return {
    paymentMode,
    metrics: {
      sourcesRegistered: database.sources.length,
      sourceOwners: registeredOwners.size,
      contributorsRewarded: rewardedContributors.size,
      researchQuestionsAnswered: database.answers.length,
      fundedCommissions: fundedAnswers.size,
      paidEvidenceUnlocks: receipts.length,
      totalUSDCDistributed: sourcePayoutsUSDC,
      // Retained for older clients. New clients should use totalUSDCDistributed.
      totalTestUSDCDistributed: sourcePayoutsUSDC,
      questionsAnswered: database.answers.length,
      freeSearchesUsed: database.userUsages.reduce(
        (total, usage) => total + usage.freeSearchesUsed,
        0
      ),
      paidSearchesCompleted: searchPayments.length,
      paidSearchRevenueUSDC: sumUSDC(
        searchPayments.map((payment) => payment.amountUSDC)
      ),
      sourcePayoutsUSDC,
      paidCitations: receipts.length
    },
    topEarningSources,
    recentPaymentStream: receipts.slice(0, 12)
  };
}
