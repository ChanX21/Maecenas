import { allocateBudget } from "@/agent/budget-allocator";
import { analyzeResearch } from "@/agent/query-planner";
import { scoutSources } from "@/agent/source-scout";
import { answerContentToText, synthesizeAnswer } from "@/agent/answer-synthesizer";
import { traceEvent } from "@/agent/trace";
import { listEvidencePaymentAttempts, listSources } from "@/db/store";
import { setNetraResearchContext, SpanType, withNetraSpan } from "@/observability/netra";
import { createEvidencePayment, getPaymentMode, requestProtectedEvidence } from "@/payments/payment-executor";
import type { Answer, ResearchStrategy, ResearchTrace, Source, TraceEvent, UnlockedEvidence } from "@/types";
import { makeId } from "@/utils/ids";
import { microsToUSDC, parseUSDCMicros, sumUSDC } from "@/utils/money";

type RunResearchInput = {
  question: string;
  clientRequestId: string;
  budgetUSDC: string;
  strategy: ResearchStrategy;
  sessionId: string;
  walletAddress?: string;
  searchPaymentId?: string;
  paymentType: "free_sponsored" | "user_paid";
  onEvent?: (event: TraceEvent) => void;
};

export async function runResearchAgent(input: RunResearchInput): Promise<{ answer: Answer; receipts: Answer["decisionTraceJson"]["receipts"] }> {
  return withNetraSpan(
    "maecenas-scholar-agent",
    {
      asType: SpanType.AGENT,
      moduleName: "research-agent",
      attributes: {
        strategy: input.strategy,
        payment_type: input.paymentType,
        has_wallet: Boolean(input.walletAddress),
        has_search_payment: Boolean(input.searchPaymentId)
      }
    },
    async (span) => {
      setNetraResearchContext(input);
      span?.setPrompt(input.question);
      span?.addEvent("scholar.run.started", {
        budget_usdc: input.budgetUSDC,
        session_id: input.sessionId
      });
      const result = await runResearchAgentCore(input);
      span?.setAttribute("answer_id", result.answer.id);
      span?.setAttribute("spent_usdc", result.answer.spentUSDC);
      span?.setAttribute("receipt_count", String(result.receipts.length));
      span?.addEvent("scholar.run.completed", {
        answer_id: result.answer.id,
        spent_usdc: result.answer.spentUSDC
      });
      return result;
    }
  );
}

async function runResearchAgentCore(input: RunResearchInput): Promise<{ answer: Answer; receipts: Answer["decisionTraceJson"]["receipts"] }> {
  const answerId = makeId("ans");
  const allSources = await listSources();
  const events: TraceEvent[] = [];
  const pushEvent = (event: TraceEvent) => {
    events.push(event);
    if (input.onEvent) input.onEvent(event);
  };

  const candidates = scoutSources(input.question, allSources);
  pushEvent(traceEvent("scout", "Archive scouted", `${candidates.length} candidate sources surfaced.`));

  const { plan, scoredSources } = await analyzeResearch(input.question, input.budgetUSDC, input.strategy, candidates);
  pushEvent(traceEvent("plan", "Mandate mapped", `${plan.subquestions.length} subquestions and ${plan.evidenceNeeds.length} evidence needs defined.`));
  pushEvent(traceEvent("score", "Evidence ranked", `Leading score: ${scoredSources[0]?.finalScore ?? 0}.`));

  const sourceById = new Map<string, Source>(allSources.map((source) => [source.id, source]));
  const paymentScope = input.searchPaymentId ?? `${input.sessionId}:${input.clientRequestId}`;
  const previousAttempts = getPaymentMode() === "real"
    ? await listEvidencePaymentAttempts(paymentScope)
    : [];
  if (previousAttempts.some((attempt) => attempt.status === "pending")) {
    throw new Error("An evidence payment has unknown settlement status and must be reconciled before retrying");
  }
  const previousPaid = previousAttempts.filter((attempt) => attempt.status === "paid" && attempt.evidence);
  const previousSourceIds = new Set(previousPaid.map((attempt) => attempt.sourceId));
  const previousSpendMicros = previousPaid.reduce((total, attempt) => total + parseUSDCMicros(attempt.amountUSDC), 0);
  const remainingBudgetUSDC = microsToUSDC(Math.max(0, parseUSDCMicros(input.budgetUSDC) - previousSpendMicros));
  const newBudgetDecision = allocateBudget(
    scoredSources.filter((source) => !previousSourceIds.has(source.sourceId)),
    remainingBudgetUSDC,
    input.strategy
  );
  const budgetDecision = {
    ...newBudgetDecision,
    maxBudgetUSDC: input.budgetUSDC,
    selectedSources: [
      ...previousPaid.map((attempt) => {
        const source = sourceById.get(attempt.sourceId)!;
        return {
          sourceId: source.id,
          title: source.title,
          priceUSDC: attempt.amountUSDC,
          reason: "Previously funded by this commission; reused without another payment."
        };
      }),
      ...newBudgetDecision.selectedSources
    ],
    estimatedSpendUSDC: sumUSDC([
      ...previousPaid.map((attempt) => attempt.amountUSDC),
      newBudgetDecision.estimatedSpendUSDC
    ])
  };
  pushEvent(
    traceEvent(
      "budget",
      "Budget allocated",
      `${budgetDecision.selectedSources.length} funded, ${budgetDecision.skippedSources.length} passed over, ${budgetDecision.estimatedSpendUSDC} USDC allocated.`
    )
  );

  const plannedEvidence = budgetDecision.selectedSources.flatMap((selected) => {
    const previous = previousPaid.find((attempt) => attempt.sourceId === selected.sourceId);
    if (previous?.evidence) {
      return [{
        sourceId: previous.sourceId,
        title: previous.evidence.title,
        authorName: previous.evidence.authorName,
        evidenceText: previous.evidence.evidenceText,
        citationPriceUSDC: previous.amountUSDC
      }];
    }
    const source = sourceById.get(selected.sourceId);
    return source ? [{
      sourceId: source.id,
      title: source.title,
      authorName: source.authorName,
      evidenceText: source.evidenceText,
      citationPriceUSDC: source.citationPriceUSDC
    }] : [];
  });
  const contentJson = await synthesizeAnswer(plan, plannedEvidence, budgetDecision);
  const unlockedEvidence: UnlockedEvidence[] = [];

  for (const selected of budgetDecision.selectedSources) {
    const source = sourceById.get(selected.sourceId);
    if (!source) continue;
    const firstAttempt = requestProtectedEvidence(source);
    if (firstAttempt.ok) continue;
    pushEvent(
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
      input.searchPaymentId,
      paymentScope
    );
    pushEvent(
      traceEvent(
        "payment-sent",
        getPaymentMode() === "mock" ? "Test funding recorded" : "USDC funding submitted",
        `${payment.receipt.amountUSDC} USDC to ${payment.receipt.recipientWallet}.`,
        getPaymentMode() === "mock" ? "mock" : "completed"
      )
    );
    const secondAttempt = payment.evidence
      ? { ok: true as const, evidence: payment.evidence }
      : requestProtectedEvidence(source, payment.paymentProof);
    if (!secondAttempt.ok) continue;
    pushEvent(traceEvent("evidence-unlocked", "Funded evidence opened", `${source.title} returned protected evidence.`));
    pushEvent(traceEvent("receipt-saved", "Treasury record sealed", `${payment.receipt.id} created for this funded citation.`));
    unlockedEvidence.push({
      ...secondAttempt.evidence,
      receipt: payment.receipt
    });
  }

  const receipts = unlockedEvidence.map((evidence) => evidence.receipt);

  const response = answerContentToText(contentJson);
  pushEvent(traceEvent("synthesis", "Research brief delivered", `The brief draws on ${unlockedEvidence.length} funded evidence sources.`));

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
