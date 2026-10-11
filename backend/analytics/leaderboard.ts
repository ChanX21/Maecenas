import type {
  CitationPayment,
  MaecenasDatabase,
  SearchPayment
} from "@/types";
import { microsToUSDC, parseUSDCMicros, sumUSDC } from "@/utils/money";

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
  const receipts = completedReceipts(database.receipts, paymentMode)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const searchPayments = completedSearchPayments(
    database.searchPayments,
    paymentMode
  );
  const completedPaymentStatus = completedSearchPaymentStatus(paymentMode);
  const activePaymentIds = new Set(
    database.researchRuns.filter((run) => run.status === "processing" && run.searchPaymentId).map((run) => run.searchPaymentId!)
  );
  const unusedSearchPayments = database.searchPayments.filter(
    (payment) => payment.status === completedPaymentStatus && !payment.usedForAnswerId && !activePaymentIds.has(payment.id)
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

  const paidEvidenceAttempts = database.evidencePaymentCosts.filter((attempt) => attempt.status === "paid");
  const paidSearchIds = new Set(database.searchPayments.map((payment) => payment.id));
  const sourcePayoutsUSDC = paymentMode === "real"
    ? sumUSDC(paidEvidenceAttempts.map((attempt) => attempt.amountUSDC))
    : sumUSDC(receipts.map((receipt) => receipt.amountUSDC));
  const userPaidSourcePayoutsUSDC = paymentMode === "real"
    ? sumUSDC(paidEvidenceAttempts.filter((attempt) =>
      attempt.fundedBy === "user_paid_search" || (!attempt.fundedBy && paidSearchIds.has(attempt.paymentScope))
    ).map((attempt) => attempt.amountUSDC))
    : sumUSDC(receipts.filter((receipt) => receipt.fundedBy === "user_paid_search").map((receipt) => receipt.amountUSDC));
  const paidSearchRevenueUSDC = sumUSDC(
    searchPayments.map((payment) => payment.amountUSDC)
  );
  const grossRetainedUSDC = microsToUSDC(Math.max(
    0,
    parseUSDCMicros(paidSearchRevenueUSDC) - parseUSDCMicros(userPaidSourcePayoutsUSDC)
  ));
  const aiCostUSDC = sumUSDC(database.researchRuns.map((run) => run.aiCostUSDC));
  const customerCreditLiabilityUSDC = sumUSDC(unusedSearchPayments.map((payment) => payment.amountUSDC));
  const trackedContributionUSDC = microsToUSDC(
    parseUSDCMicros(paidSearchRevenueUSDC) -
    parseUSDCMicros(sourcePayoutsUSDC) -
    parseUSDCMicros(aiCostUSDC)
  );
  const month = new Date().toISOString().slice(0, 7);
  const monthlyRevenueMicros = searchPayments
    .filter((payment) => payment.createdAt.startsWith(month))
    .reduce((total, payment) => total + parseUSDCMicros(payment.amountUSDC), 0);
  const monthlyPayoutMicros = (paymentMode === "real" ? paidEvidenceAttempts : receipts)
    .filter((payment) => payment.createdAt.startsWith(month))
    .reduce((total, payment) => total + parseUSDCMicros(payment.amountUSDC), 0);
  const monthlyAiMicros = database.researchRuns
    .filter((run) => run.createdAt.startsWith(month))
    .reduce((total, run) => total + parseUSDCMicros(run.aiCostUSDC), 0);
  const monthlyInfraMicros = parseUSDCMicros(process.env.MONTHLY_INFRA_COST_USDC ?? "0");
  const monthlyOtherMicros = parseUSDCMicros(process.env.MONTHLY_OTHER_COST_USDC ?? "0");
  const monthlyNetUSDC = microsToUSDC(
    monthlyRevenueMicros - monthlyPayoutMicros - monthlyAiMicros - monthlyInfraMicros - monthlyOtherMicros
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
      paidSearchRevenueUSDC,
      userPaidSourcePayoutsUSDC,
      grossRetainedUSDC,
      aiCostUSDC,
      customerCreditLiabilityUSDC,
      trackedContributionUSDC,
      monthlyInfraCostUSDC: microsToUSDC(monthlyInfraMicros),
      monthlyOtherCostUSDC: microsToUSDC(monthlyOtherMicros),
      monthlyNetUSDC,
      sourcePayoutsUSDC,
      paidCitations: receipts.length
    },
    topEarningSources,
    recentPaymentStream: receipts.slice(0, 12)
  };
}
