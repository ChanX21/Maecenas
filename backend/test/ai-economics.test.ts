import assert from "node:assert/strict";
import test from "node:test";
import { aiUsageCostMicros, createAiBudget, validateAiEconomics } from "@/agent/ai";

test("prices and caps the default cost-sensitive research model", () => {
  const previous = { ...process.env };
  try {
    delete process.env.AI_INPUT_USDC_PER_MILLION;
    delete process.env.AI_OUTPUT_USDC_PER_MILLION;
    process.env.OPENAI_MODEL = "gpt-6-luna";
    process.env.AI_MAX_COST_USDC = "0.015";

    assert.equal(aiUsageCostMicros("gpt-6-luna", 10_000, 2_000), 2_000);
    assert.equal(createAiBudget().remainingMicros, 15_000);
    assert.doesNotThrow(validateAiEconomics);
  } finally {
    process.env = previous;
  }
});

test("requires explicit token prices for an unknown model", () => {
  const previous = { ...process.env };
  try {
    delete process.env.AI_INPUT_USDC_PER_MILLION;
    delete process.env.AI_OUTPUT_USDC_PER_MILLION;
    process.env.OPENAI_MODEL = "unknown-model";
    assert.throws(validateAiEconomics, /token prices are required/);
  } finally {
    process.env = previous;
  }
});
