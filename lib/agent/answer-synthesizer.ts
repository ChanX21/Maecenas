import type { BudgetDecision, ResearchPlan, UnlockedEvidence } from "@/lib/types";

export function synthesizeAnswer(
  plan: ResearchPlan,
  unlockedEvidence: UnlockedEvidence[],
  budgetDecision: BudgetDecision
): string {
  const paidCount = unlockedEvidence.length;
  const skippedCount = budgetDecision.skippedSources.length;
  const evidenceSummary = unlockedEvidence
    .map((evidence, index) => `${index + 1}. ${evidence.title}: ${evidence.evidenceText}`)
    .join("\n\n");

  return [
    `This answer used ${paidCount} paid evidence sources and ${skippedCount} skipped-source explanations.`,
    "",
    `Direct answer: ${plan.userQuestion}`,
    "",
    "Nanopayments matter for AI agents because they let an agent buy only the specific information or service call it needs at the moment of use. Instead of forcing every source behind a subscription, x402-style paid endpoints can quote a small USDC price, let the agent compare value against its budget, and unlock evidence only after payment. That makes source usage measurable, auditable, and economically visible.",
    "",
    "For creators and source owners, the important shift is not that a citation becomes proof of truth. It is that a useful source can receive a receipt-backed payment when an agent decides the evidence is worth using. For agents, the important shift is budget discipline: the agent can skip broad, redundant, or overpriced sources and spend on the evidence that best answers the question.",
    "",
    "Paid evidence used:",
    evidenceSummary,
    "",
    "Boundary: Mecenas is an experimental attribution and payment layer for AI-agent source usage. It rewards usage, not academic merit, and this MVP does not verify academic ownership."
  ].join("\n");
}
