import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("free quota, mock payment, idempotency, and funding links", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "maecenas-"));
  process.env.DATABASE_URL = path.join(dir, "test.db");
  process.env.PAYMENT_MODE = "mock";
  process.env.FREE_SEARCH_LIMIT = "5";
  process.env.FREE_SEARCH_BUDGET_USDC = "0.01";
  process.env.PAID_SEARCH_PRICE_USDC = "0.01";
  process.env.MAECENAS_TREASURY_WALLET_ADDRESS = "0x2222222222222222222222222222222222222222";

  const store = await import("@/db/store");
  const { createMecenasServer } = await import("@/http");
  store.initializeDatabase();
  store.seedDatabase();

  const server = createMecenasServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const sessionId = "sess_acceptance_001";
  const walletAddress = "0x1111111111111111111111111111111111111111";

  const post = async (route: string, body: unknown) => {
    const response = await fetch(`${base}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return { response, body: (await response.json()) as Record<string, any> };
  };

  try {
    let firstAnswerId = "";
    for (let index = 0; index < 5; index += 1) {
      const result = await post("/api/research", {
        sessionId,
        clientRequestId: `request_free_${index}`,
        question: "Why do nanopayments matter for research agents?",
        budgetUSDC: "0.01",
        strategy: "balanced"
      });
      assert.equal(result.response.status, 200);
      assert.equal(result.body.paymentType, "free_sponsored");
      assert.equal(result.body.freeSearchesRemaining, 4 - index);
      if (index === 0) firstAnswerId = result.body.answerId;
    }

    const retry = await post("/api/research", {
      sessionId,
      clientRequestId: "request_free_0",
      question: "Why do nanopayments matter for research agents?",
      budgetUSDC: "0.01",
      strategy: "balanced"
    });
    assert.equal(retry.body.answerId, firstAnswerId);

    const sixth = await post("/api/research", {
      sessionId,
      clientRequestId: "request_sixth",
      question: "What happens after the quota?",
      strategy: "balanced"
    });
    assert.equal(sixth.response.status, 402);
    assert.equal(sixth.body.error, "PAYMENT_REQUIRED");

    const intent = await post("/api/payments/search-intent", { sessionId, walletAddress });
    assert.equal(intent.response.status, 201);
    assert.equal(intent.body.amountUSDC, "0.01");

    const proofInput = {
      paymentIntentId: intent.body.paymentIntentId,
      sessionId,
      walletAddress,
      paymentProof: "mock_x402_payment_proof_acceptance",
      txHash: "mock_tx_acceptance"
    };
    const proof = await post("/api/payments/search-proof", proofInput);
    const proofRetry = await post("/api/payments/search-proof", proofInput);
    assert.equal(proof.body.searchPaymentId, proofRetry.body.searchPaymentId);
    assert.equal(proof.body.status, "mock");

    const paid = await post("/api/research", {
      sessionId,
      walletAddress,
      searchPaymentId: proof.body.searchPaymentId,
      clientRequestId: "request_paid_1",
      question: "How does paid evidence improve an answer?",
      budgetUSDC: "1.00",
      strategy: "balanced"
    });
    assert.equal(paid.response.status, 200);
    assert.equal(paid.body.paymentType, "user_paid");
    assert.equal(paid.body.budget.max, "0.01");
    assert.ok(paid.body.receipts.every((receipt: Record<string, unknown>) => receipt.fundedBy === "user_paid_search"));

    const reused = await post("/api/research", {
      sessionId,
      walletAddress,
      searchPaymentId: proof.body.searchPaymentId,
      clientRequestId: "request_paid_2",
      question: "Can the payment be reused?",
      strategy: "balanced"
    });
    assert.equal(reused.response.status, 409);
    assert.equal(reused.body.error, "SEARCH_PAYMENT_ALREADY_USED");

    const secondIntent = store.createSearchPaymentIntent(sessionId, walletAddress);
    const secondPayment = store.confirmSearchPayment({
      paymentIntentId: secondIntent.id,
      sessionId,
      walletAddress,
      paymentProof: "mock_second_payment"
    });
    const failedPaidRun = store.beginResearch({
      sessionId,
      walletAddress,
      searchPaymentId: secondPayment.id,
      clientRequestId: "request_paid_failure",
      question: "This paid run fails after reservation",
      strategy: "balanced"
    });
    assert.equal(failedPaidRun.kind, "started");
    if (failedPaidRun.kind === "started") store.failResearch(failedPaidRun.runId);
    assert.equal(store.getSearchPayment(secondPayment.id)?.usedForAnswerId, undefined);
    const paidRetry = store.beginResearch({
      sessionId,
      walletAddress,
      searchPaymentId: secondPayment.id,
      clientRequestId: "request_paid_retry",
      question: "The released payment can fund a retry",
      strategy: "balanced"
    });
    assert.equal(paidRetry.kind, "started");
    if (paidRetry.kind === "started") store.failResearch(paidRetry.runId);

    const usageResponse = await fetch(`${base}/api/usage?sessionId=${sessionId}&wallet=${walletAddress}`);
    const usage = (await usageResponse.json()) as Record<string, unknown>;
    assert.equal(usage.freeSearchesUsed, 5);
    assert.equal(usage.paidSearchesUsed, 1);

    const failedSession = "sess_failure_001";
    const run = store.beginResearch({
      sessionId: failedSession,
      clientRequestId: "request_failure_001",
      question: "This run fails after reservation",
      strategy: "balanced"
    });
    assert.equal(run.kind, "started");
    if (run.kind === "started") store.failResearch(run.runId);
    assert.equal(store.getUsageBySession(failedSession)?.freeSearchesUsed, 0);

    const concurrentSession = "sess_concurrent_001";
    const reservations = Array.from({ length: 5 }, (_, index) =>
      store.beginResearch({
        sessionId: concurrentSession,
        clientRequestId: `request_concurrent_${index}`,
        question: "Reserve one free quota slot",
        strategy: "balanced"
      })
    );
    assert.throws(
      () =>
        store.beginResearch({
          sessionId: concurrentSession,
          clientRequestId: "request_concurrent_5",
          question: "This reservation exceeds the quota",
          strategy: "balanced"
        }),
      (error: unknown) => error instanceof store.StoreError && error.code === "FREE_QUOTA_BUSY"
    );
    for (const reservation of reservations) {
      if (reservation.kind === "started") store.failResearch(reservation.runId);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    store.closeDatabase();
    rmSync(dir, { recursive: true, force: true });
  }
});
