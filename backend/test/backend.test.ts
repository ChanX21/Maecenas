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
  process.env.AI_MODE = "test";
  process.env.FREE_SEARCH_LIMIT = "5";
  process.env.FREE_SEARCH_BUDGET_USDC = "0.01";
  process.env.PAID_SEARCH_PRICE_USDC = "0.01";
  process.env.MAECENAS_TREASURY_WALLET_ADDRESS = "0x2222222222222222222222222222222222222222";
  process.env.ADMIN_TOKEN = "test_admin_token";

  const store = await import("@/db/store");
  const { createMaecenasServer } = await import("@/http");
  store.initializeDatabase();
  store.seedDatabase();

  const server = createMaecenasServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const sessionId = "sess_acceptance_001";
  const walletAddress = "0x1111111111111111111111111111111111111111";

  const post = async (route: string, body: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(`${base}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body)
    });
    return { response, body: (await response.json()) as Record<string, any> };
  };

  try {
    const submitted = await post("/api/sources", {
      title: "Independent Nanopayment Evidence",
      authorName: "Test Source Owner",
      sourceUrl: "https://example.org/independent-nanopayment-evidence",
      walletAddress,
      citationPriceUSDC: "0.0001",
      abstract: "Independent evidence about nanopayment authorization, settlement, and accountable source compensation.",
      evidenceText:
        "Nanopayment authorization lets software purchase one narrowly scoped evidence item while preserving a receipt that identifies the buyer, source owner, amount, and funded research session.",
      tags: "nanopayments, evidence, authorization"
    });
    assert.equal(submitted.response.status, 201);
    assert.equal(submitted.body.source.status, "pending");
    const publicSourcesBefore = (await (await fetch(`${base}/api/sources`)).json()) as Record<string, any>;
    assert.ok(!publicSourcesBefore.sources.some((source: Record<string, unknown>) => source.id === submitted.body.source.id));
    const ownerSources = (await (await fetch(`${base}/api/sources?wallet=${walletAddress}`)).json()) as Record<string, any>;
    assert.equal(ownerSources.sources.find((source: Record<string, unknown>) => source.id === submitted.body.source.id)?.status, "pending");
    const reviewQueue = (await (
      await fetch(`${base}/api/admin/sources?status=pending`, {
        headers: { Authorization: "Bearer test_admin_token" }
      })
    ).json()) as Record<string, any>;
    assert.ok(reviewQueue.sources.some((source: Record<string, unknown>) => source.id === submitted.body.source.id));

    const unauthorizedReview = await post(`/api/admin/sources/${submitted.body.source.id}/review`, { status: "approved" });
    assert.equal(unauthorizedReview.response.status, 401);
    const approved = await post(
      `/api/admin/sources/${submitted.body.source.id}/review`,
      { status: "approved" },
      { Authorization: "Bearer test_admin_token" }
    );
    assert.equal(approved.body.source.status, "approved");
    const duplicate = await post("/api/sources", {
      title: "Duplicate",
      authorName: "Test Source Owner",
      sourceUrl: "https://example.org/independent-nanopayment-evidence",
      walletAddress,
      citationPriceUSDC: "0.0001",
      abstract: "A duplicate source submission with enough abstract text to pass normal input validation.",
      evidenceText:
        "This evidence body is intentionally long enough to pass validation while reusing the same canonical source URL.",
      tags: "duplicate, evidence"
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.body.error, "SOURCE_ALREADY_REGISTERED");

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
    const answerResponse = await fetch(`${base}/api/answers/${firstAnswerId}`);
    const savedAnswer = (await answerResponse.json()) as Record<string, any>;
    assert.match(savedAnswer.answer.contentJson.summary, /nanopayments matter/i);
    assert.ok(savedAnswer.answer.contentJson.sections[0].citations.length > 0);

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

    delete process.env.AI_MODE;
    const unconfigured = await post("/api/research", {
      sessionId: "sess_no_ai_key_001",
      clientRequestId: "request_no_ai_key",
      question: "Can this return a canned answer?",
      strategy: "balanced"
    });
    assert.equal(unconfigured.response.status, 503);
    assert.equal(unconfigured.body.error, "AI_NOT_CONFIGURED");
    assert.equal(store.getUsageBySession("sess_no_ai_key_001")?.freeSearchesUsed, 0);
    process.env.AI_MODE = "test";
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    store.closeDatabase();
    rmSync(dir, { recursive: true, force: true });
  }
});
