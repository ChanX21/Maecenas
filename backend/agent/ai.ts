import OpenAI from "openai";
import { microsToUSDC, parseUSDCMicros } from "@/utils/money";

export type AiUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSDC: string;
};

export type AiBudget = { remainingMicros: number };

const modelRates: Record<string, { input: number; output: number }> = {
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5.6-luna": { input: 0.2, output: 1.2 },
  "gpt-6-luna": { input: 0.1, output: 0.5 },
  "gpt-5.6-terra": { input: 2, output: 12 }
};

export function createAiBudget(): AiBudget {
  return { remainingMicros: parseUSDCMicros(process.env.AI_MAX_COST_USDC ?? "0.015") };
}

export function emptyAiUsage(): AiUsage {
  return { model: "test", inputTokens: 0, outputTokens: 0, costUSDC: "0" };
}

export function aiUsageCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  const defaults = modelRates[model];
  const input = Number(process.env.AI_INPUT_USDC_PER_MILLION ?? defaults?.input);
  const output = Number(process.env.AI_OUTPUT_USDC_PER_MILLION ?? defaults?.output);
  if (!Number.isFinite(input) || input < 0 || !Number.isFinite(output) || output < 0) {
    throw new Error(`AI token prices are required for ${model}`);
  }
  // A token multiplied by dollars-per-million equals micro-USDC at USDC's dollar peg.
  return Math.ceil(inputTokens * input + outputTokens * output);
}

export function validateAiEconomics(): void {
  createAiBudget();
  aiUsageCostMicros(process.env.OPENAI_MODEL ?? "gpt-6-luna", 1, 1);
  for (const [name, fallback] of [
    ["AI_PLANNING_MAX_OUTPUT_TOKENS", 2500],
    ["AI_SYNTHESIS_MAX_OUTPUT_TOKENS", 2000],
    ["AI_EVIDENCE_CHARS_PER_SOURCE", 4000]
  ] as const) {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  }
}

export class AgentError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function generateStructured<T>(
  name: string,
  schema: Record<string, unknown>,
  system: string,
  input: unknown,
  budget: AiBudget,
  maxOutputTokens: number,
  onUsage?: (usage: AiUsage) => Promise<void>
): Promise<{ value: T; usage: AiUsage }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AgentError("AI_NOT_CONFIGURED", "OPENAI_API_KEY is required for research", 503);

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-6-luna";
    const estimatedInputTokens = Math.ceil(Buffer.byteLength(JSON.stringify({ system, input, schema }), "utf8") / 3);
    const estimatedCost = aiUsageCostMicros(model, estimatedInputTokens, maxOutputTokens);
    if (estimatedCost > budget.remainingMicros) {
      throw new AgentError(
        "AI_BUDGET_EXCEEDED",
        `This request exceeds the ${process.env.AI_MAX_COST_USDC ?? "0.015"} USDC AI budget`,
        422
      );
    }
    const client = new OpenAI({ apiKey, timeout: 60_000 });
    const response = await client.responses.create({
      model,
      store: false,
      max_output_tokens: maxOutputTokens,
      input: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input) }
      ],
      text: {
        verbosity: "low",
        format: { type: "json_schema", name, strict: true, schema }
      }
    });
    if (!response.usage) throw new Error("Model returned no token usage");
    const costMicros = aiUsageCostMicros(model, response.usage.input_tokens, response.usage.output_tokens);
    budget.remainingMicros -= costMicros;
    const usage = {
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUSDC: microsToUSDC(costMicros)
    };
    await onUsage?.(usage);
    if (budget.remainingMicros < 0) throw new AgentError("AI_BUDGET_EXCEEDED", "The research AI budget was exceeded", 422);
    if (!response.output_text) throw new Error("Model returned no structured output");
    return {
      value: JSON.parse(response.output_text) as T,
      usage
    };
  } catch (error) {
    if (error instanceof AgentError) throw error;
    throw new AgentError("AI_PROVIDER_ERROR", "The research model could not complete this request", 502);
  }
}
