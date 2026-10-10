import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { validateEnvironment } from "@/env";
import { seedDatabase } from "@/db/store";
import { validateArcRpc } from "@/payments/circle-gateway";

test("mainnet rejects demo configuration and invalid economics before serving requests", async () => {
  const previous = { ...process.env };
  const privateKey = `0x${"11".repeat(32)}` as const;
  try {
    Object.assign(process.env, {
      ARC_ENVIRONMENT: "mainnet", PAYMENT_MODE: "real", MAINNET_PAYMENTS_ENABLED: "true",
      DISABLE_RESEARCH_GUARDRAILS: "false", AI_MODE: "live", OPENAI_API_KEY: "test-placeholder",
      ARC_RPC_URL: "https://rpc.example.test", PUBLIC_BACKEND_URL: "https://api.example.test",
      CORS_ORIGIN: "https://example.test", TOKEN_SIGNING_SECRET: "test-placeholder",
      IP_HASH_SECRET: "test-placeholder", ADMIN_TOKEN: "test-placeholder",
      MAECENAS_AGENT_PRIVATE_KEY: privateKey,
      MAECENAS_AGENT_WALLET_ADDRESS: privateKeyToAccount(privateKey).address,
      MAECENAS_TREASURY_WALLET_ADDRESS: "0x2222222222222222222222222222222222222222",
      PAID_SEARCH_PRICE_USDC: "0.05", AUTHOR_POOL_BPS: "7000", PLATFORM_FEE_BPS: "1000",
      FREE_SEARCH_LIMIT: "0", FREE_SEARCH_BUDGET_USDC: "0.01", SPONSORED_TREASURY_LIMIT_USDC: "0"
    });
    assert.doesNotThrow(validateEnvironment);
    for (const [key, value, error] of [
      ["PAYMENT_MODE", "reel", /PAYMENT_MODE/],
      ["PAYMENT_MODE", "mock", /PAYMENT_MODE=real/],
      ["MAINNET_PAYMENTS_ENABLED", "false", /MAINNET_PAYMENTS_ENABLED/],
      ["DISABLE_RESEARCH_GUARDRAILS", "true", /guardrails/],
      ["AI_MODE", "test", /AI_MODE/],
      ["OPENAI_API_KEY", "", /OPENAI_API_KEY/],
      ["PAID_SEARCH_PRICE_USDC", "0", /PAID_SEARCH_PRICE/],
      ["PAID_SEARCH_PRICE_USDC", "2147.483648", /PAID_SEARCH_PRICE/],
      ["AUTHOR_POOL_BPS", "9500", /total at most/],
      ["FREE_SEARCH_LIMIT", "-1", /FREE_SEARCH_LIMIT/],
      ["FREE_SEARCH_BUDGET_USDC", "NaN", /USDC amount/]
    ] as const) {
      const saved = process.env[key];
      process.env[key] = value;
      assert.throws(validateEnvironment, error);
      process.env[key] = saved;
    }
    assert.equal(await seedDatabase(), 0, "mainnet must not connect to the DB to seed demo payout addresses");
  } finally {
    process.env = previous;
  }
});

test("RPC chain ID must match the configured payment network", async () => {
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  try {
    process.env.ARC_ENVIRONMENT = "mainnet";
    process.env.ARC_RPC_URL = "https://rpc.example.test";
    let chainId = 5042002;
    globalThis.fetch = async (_input, init) => {
      const request = JSON.parse(String(init?.body));
      assert.equal(request.method, "eth_chainId");
      return Response.json({ jsonrpc: "2.0", id: request.id, result: `0x${chainId.toString(16)}` });
    };
    await assert.rejects(validateArcRpc, /chain ID does not match/);
    chainId = 5042;
    await assert.doesNotReject(validateArcRpc);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = previous;
  }
});
