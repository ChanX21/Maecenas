import { badRequest, json } from "@/lib/api/json";
import { runResearchAgent } from "@/lib/agent/research-agent";
import type { ResearchStrategy } from "@/lib/types";

const strategies = new Set(["conservative", "balanced", "aggressive"]);

export async function POST(request: Request) {
  const body = await request.json();
  const question = String(body.question ?? "").trim();
  const budgetUSDC = String(body.budgetUSDC ?? "0.01");
  const strategy = String(body.strategy ?? "balanced") as ResearchStrategy;

  if (!question) return badRequest("Question is required");
  if (!strategies.has(strategy)) return badRequest("Strategy must be conservative, balanced, or aggressive");

  const answer = await runResearchAgent({ question, budgetUSDC, strategy });
  return json({
    answerId: answer.id,
    status: "completed",
    budget: {
      max: answer.budgetUSDC,
      spent: answer.spentUSDC
    },
    selectedSources: answer.decisionTraceJson.budgetDecision.selectedSources,
    skippedSources: answer.decisionTraceJson.budgetDecision.skippedSources,
    receipts: answer.decisionTraceJson.receipts
  });
}
