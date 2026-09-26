import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import {
  CirclePaymentError,
  circlePaymentRequired,
  settleCirclePayment,
  splitSettlementReference,
  validateCirclePaymentEnvironment
} from "@/payments/circle-gateway";
import {
  getArcChainName,
  getArcConfig,
  getArcNetwork,
  getCircleGatewayUrl
} from "@/payments/arc-environment";

test("separates Gateway payment IDs from EVM transaction hashes", () => {
  const paymentId = "10d391a5-a727-4c68-9f3e-7264a900def4";
  const txHash = `0x${"ab".repeat(32)}`;

  assert.deepEqual(splitSettlementReference(paymentId), {
    paymentId,
    txHash: undefined
  });
  assert.deepEqual(splitSettlementReference(txHash), {
    paymentId: txHash,
    txHash
  });
});

test("settlement errors distinguish a rejection from an unknown result", async () => {
  const originalFetch = globalThis.fetch;
  const required = circlePaymentRequired(
    "0.05",
    "0x2222222222222222222222222222222222222222",
    "https://example.test/paid"
  );
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false, errorReason: "rejected" }));
    await assert.rejects(
      () => settleCirclePayment({}, required),
      (error) => error instanceof CirclePaymentError && !error.mayHaveMoved
    );

    globalThis.fetch = async () => { throw new Error("connection lost"); };
    await assert.rejects(
      () => settleCirclePayment({}, required),
      (error) => error instanceof CirclePaymentError && error.mayHaveMoved
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Arc environment selects matching chain, x402 network, and Gateway", () => {
  const previous = process.env.ARC_ENVIRONMENT;
  try {
    process.env.ARC_ENVIRONMENT = "testnet";
    assert.equal(getArcChainName(), "arcTestnet");
    assert.equal(getArcConfig().chain.id, 5042002);
    assert.equal(getArcNetwork(), "eip155:5042002");
    assert.equal(getCircleGatewayUrl(), "https://gateway-api-testnet.circle.com");

    process.env.ARC_ENVIRONMENT = "mainnet";
    assert.equal(getArcChainName(), "arc");
    assert.equal(getArcConfig().chain.id, 5042);
    assert.equal(getArcNetwork(), "eip155:5042");
    assert.equal(getCircleGatewayUrl(), "https://gateway-api.circle.com");
    assert.equal(
      circlePaymentRequired("0.05", "0x2222222222222222222222222222222222222222", "https://example.test").accepts[0].network,
      "eip155:5042"
    );

    process.env.ARC_ENVIRONMENT = "production";
    assert.throws(getArcConfig, /ARC_ENVIRONMENT must be testnet or mainnet/);
  } finally {
    if (previous === undefined) delete process.env.ARC_ENVIRONMENT;
    else process.env.ARC_ENVIRONMENT = previous;
  }
});

test("real payment configuration fails closed unless mainnet is explicitly enabled", () => {
  const keys = [
    "ARC_ENVIRONMENT",
    "MAINNET_PAYMENTS_ENABLED",
    "MAECENAS_AGENT_PRIVATE_KEY",
    "MAECENAS_AGENT_WALLET_ADDRESS",
    "MAECENAS_TREASURY_WALLET_ADDRESS"
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const privateKey = `0x${"11".repeat(32)}` as const;
  try {
    process.env.MAECENAS_AGENT_PRIVATE_KEY = privateKey;
    process.env.MAECENAS_AGENT_WALLET_ADDRESS = privateKeyToAccount(privateKey).address;
    process.env.MAECENAS_TREASURY_WALLET_ADDRESS = "0x2222222222222222222222222222222222222222";
    process.env.ARC_ENVIRONMENT = "testnet";
    process.env.MAINNET_PAYMENTS_ENABLED = "false";
    assert.doesNotThrow(validateCirclePaymentEnvironment);
    process.env.MAECENAS_TREASURY_WALLET_ADDRESS = process.env.MAECENAS_AGENT_WALLET_ADDRESS;
    assert.throws(validateCirclePaymentEnvironment, /must be different/);
    process.env.MAECENAS_TREASURY_WALLET_ADDRESS = "0x2222222222222222222222222222222222222222";

    process.env.ARC_ENVIRONMENT = "mainnet";
    assert.throws(validateCirclePaymentEnvironment, /MAINNET_PAYMENTS_ENABLED=true/);
    process.env.MAINNET_PAYMENTS_ENABLED = "true";
    assert.doesNotThrow(validateCirclePaymentEnvironment);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
