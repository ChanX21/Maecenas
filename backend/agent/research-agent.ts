import { allocateBudget } from "@/agent/budget-allocator";
import { analyzeResearch } from "@/agent/query-planner";
import { scoutSources } from "@/agent/source-scout";
import { answerContentToText, synthesizeAnswer } from "@/agent/answer-synthesizer";
import { traceEvent } from "@/agent/trace";
import { listSources } from "@/db/store";
import { createEvidencePayment, getPaymentMode, requestProtectedEvidence } from "@/payments/payment-executor";
import type { Answer, ResearchStrategy, ResearchTrace, Source, TraceEvent, UnlockedEvidence } from "@/types";
import { makeId } from "@/utils/ids";
import { sumUSDC } from "@/utils/money";

type RunResearchInput = {
  question: string;
  budgetUSDC: string;
  strategy: ResearchStrategy;
  sessionId: string;
  walletAddress?: string;
  searchPaymentId?: string;
  paymentType: "free_sponsored" | "user_paid";
};

export async function runResearchAgent(input: RunResearchInput): Promise<{ answer: Answer; receipts: Answer["decisionTraceJson"]["receipts"] }> {
  const answerId = makeId("ans");
  const allSources = await listSources();
  const events: TraceEvent[] = [];
  const candidates = scoutSources(input.question, allSources);
  events.push(traceEvent("scout", "Source registry searched", `${candidates.length} candidate sources found.`));

  const { plan, scoredSources } = await analyzeResearch(input.question, input.budgetUSDC, input.strategy, candidates);
  events.push(traceEvent("plan", "Research plan created", `${plan.subquestions.length} subquestions and ${plan.evidenceNeeds.length} evidence needs.`));
  events.push(traceEvent("score", "Candidate sources scored", `Top score: ${scoredSources[0]?.finalScore ?? 0}.`));

  const budgetDecision = allocateBudget(scoredSources, input.budgetUSDC, input.strategy);
  events.push(
    traceEvent(
      "budget",
      "Budget allocated",
      `${budgetDecision.selectedSources.length} selected, ${budgetDecision.skippedSources.length} skipped, estimated spend ${budgetDecision.estimatedSpendUSDC} USDC.`
    )
  );

  const sourceById = new Map<string, Source>(allSources.map((source) => [source.id, source]));
  const unlockedEvidence: UnlockedEvidence[] = [];

  for (const selected of budgetDecision.selectedSources) {
    const source = sourceById.get(selected.sourceId);
    if (!source) continue;
    const firstAttempt = requestProtectedEvidence(source);
    if (firstAttempt.ok) continue;
    events.push(
      traceEvent(
        "payment-required",
        "402 Payment Required",
        `${source.title} quoted ${firstAttempt.challenge.x402.amountUSDC} USDC on ${firstAttempt.challenge.x402.network}.`
      )
    );
    const payment = await createEvidencePayment(
      source,
      answerId,
      input.question,
      input.paymentType === "user_paid" ? "user_paid_search" : "maecenas_sponsored",
      input.searchPaymentId
    );
    events.push(
      traceEvent(
        "payment-sent",
        getPaymentMode() === "mock" ? "MOCK PAYMENT sent" : "USDC nanopayment submitted",
        `${payment.receipt.amountUSDC} USDC to ${payment.receipt.recipientWallet}.`,
        getPaymentMode() === "mock" ? "mock" : "completed"
      )
    );
    const secondAttempt = requestProtectedEvidence(source, payment.paymentProof);
    if (!secondAttempt.ok) continue;
    events.push(traceEvent("evidence-unlocked", "Evidence unlocked", `${source.title} returned protected evidence.`));
    events.push(traceEvent("receipt-saved", "Receipt prepared", `${payment.receipt.id} created for paid citation.`));
    unlockedEvidence.push({
      ...secondAttempt.evidence,
      receipt: payment.receipt
    });
  }

  const receipts = unlockedEvidence.map((evidence) => evidence.receipt);

  const contentJson = await synthesizeAnswer(plan, unlockedEvidence, budgetDecision);
  const response = answerContentToText(contentJson);
  events.push(traceEvent("synthesis", "Cited answer generated", `Answer uses ${unlockedEvidence.length} selected evidence sources.`));

  const trace: ResearchTrace = {
    plan,
    candidates,
    scoredSources,
    budgetDecision,
    receipts,
    events,
    paymentMode: getPaymentMode()
  };

  const answer: Answer = {
    id: answerId,
    prompt: input.question,
    response,
    contentJson,
    budgetUSDC: input.budgetUSDC,
    spentUSDC: sumUSDC(receipts.map((receipt) => receipt.amountUSDC)),
    citedSourceIds: [...new Set(contentJson.sections.flatMap((section) => section.citations))],
    decisionTraceJson: trace,
    searchPaymentId: input.searchPaymentId,
    paymentType: input.paymentType,
    sessionId: input.sessionId,
    walletAddress: input.walletAddress,
    createdAt: new Date().toISOString()
  };
  return { answer, receipts };
}
