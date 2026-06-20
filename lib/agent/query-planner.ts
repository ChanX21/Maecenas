import type { ResearchPlan, ResearchStrategy } from "@/lib/types";

const defaultNeeds = [
  "technical payment mechanism",
  "economic rationale",
  "creator monetization",
  "risks or limitations"
];

export function planResearch(
  userQuestion: string,
  maxBudgetUSDC: string,
  strategy: ResearchStrategy
): ResearchPlan {
  const normalized = userQuestion.trim();
  const lower = normalized.toLowerCase();

  const subquestions = [
    lower.includes("x402") ? "How does x402 structure paid HTTP access?" : "What payment mechanism is relevant?",
    lower.includes("creator") || lower.includes("source")
      ? "How can creators or source owners earn from agent usage?"
      : "Who receives value when agents pay for evidence?",
    lower.includes("risk") ? "What risks or limitations should be disclosed?" : "Why do nanopayments matter for AI agents?",
    "Which registered sources are worth buying under the budget?"
  ];

  return {
    userQuestion: normalized,
    subquestions,
    evidenceNeeds: defaultNeeds,
    maxBudgetUSDC,
    strategy
  };
}
