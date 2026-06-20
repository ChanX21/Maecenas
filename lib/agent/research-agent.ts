import { allocateBudget } from "@/lib/agent/budget-allocator";
import { planResearch } from "@/lib/agent/query-planner";
import { scoutSources } from "@/lib/agent/source-scout";
import { scoreSources } from "@/lib/agent/source-scorer";
import { synthesizeAnswer } from "@/lib/agent/answer-synthesizer";
import { traceEvent } from "@/lib/agent/trace";
import { createAnswer, createReceipts, listSources } from "@/lib/db/store";
import { buildPaymentRequired, getPaymentMode, unlockEvidenceWithPayment } from "@/lib/payments/payment-executor";
import type { Answer, ResearchStrategy, ResearchTrace, Source, TraceEvent, UnlockedEvidence } from "@/lib/types";
import { makeId } from "@/lib/utils/ids";
import { sumUSDC } from "@/lib/utils/money";

type RunResearchInput = {
  question: string;
  budgetUSDC: string;
  strategy: ResearchStrategy;
};

export async function runResearchAgent(input: RunResearchInput): Promise<Answer> {
  const answerId = makeId("ans");
  const allSources = await listSources();
  const events: TraceEvent[] = [];
  const plan = planResearch(input.question, input.budgetUSDC, input.strategy);
  events.push(traceEvent("plan", "Research plan created", `${plan.subquestions.length} subquestions and ${plan.evidenceNeeds.length} evidence needs.`));

  const candidates = scoutSources(plan, allSources);
  events.push(traceEvent("scout", "Source registry searched", `${candidates.length} candidate sources found.`));

  const scoredSources = scoreSources(plan, candidates);
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
    const challenge = buildPaymentRequired(source);
    events.push(
      traceEvent(
        "payment-required",
        "402 Payment Required",
        `${source.title} quoted ${challenge.x402.amountUSDC} USDC on ${challenge.x402.network}.`
      )
    );
    const unlocked = await unlockEvidenceWithPayment(source, answerId, input.question);
    events.push(
      traceEvent(
        "payment-sent",
        getPaymentMode() === "mock" ? "MOCK PAYMENT sent" : "USDC nanopayment submitted",
        `${unlocked.receipt.amountUSDC} USDC to ${unlocked.receipt.recipientWallet}.`,
        getPaymentMode() === "mock" ? "mock" : "completed"
      )
    );
    events.push(traceEvent("evidence-unlocked", "Evidence unlocked", `${source.title} returned protected evidence.`));
    events.push(traceEvent("receipt-saved", "Receipt prepared", `${unlocked.receipt.id} created for paid citation.`));
    unlockedEvidence.push(unlocked);
  }

  const receipts = unlockedEvidence.map((evidence) => evidence.receipt);
  await createReceipts(receipts);

  const response = synthesizeAnswer(plan, unlockedEvidence, budgetDecision);
  events.push(traceEvent("synthesis", "Cited answer generated", `Answer uses ${unlockedEvidence.length} paid evidence sources.`));

  const trace: ResearchTrace = {
    plan,
    candidates,
    scoredSources,
    budgetDecision,
    receipts,
    events,
    paymentMode: getPaymentMode()
  };

  return createAnswer({
    id: answerId,
    prompt: input.question,
    response,
    budgetUSDC: input.budgetUSDC,
    spentUSDC: sumUSDC(receipts.map((receipt) => receipt.amountUSDC)),
    citedSourceIds: unlockedEvidence.map((evidence) => evidence.sourceId),
    decisionTraceJson: trace,
    createdAt: new Date().toISOString()
  });
}
