import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";

test("free quota, mock payment, idempotency, and funding links", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  process.env.NODE_ENV = "test";
  process.env.SUPABASE_DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.PAYMENT_MODE = "mock";
  process.env.AI_MODE = "test";
  process.env.FREE_SEARCH_LIMIT = "5";
  process.env.FREE_SEARCH_BUDGET_USDC = "0.01";
  process.env.PAID_SEARCH_PRICE_USDC = "0.01";
  process.env.AUTHOR_POOL_BPS = "7000";
  process.env.MAECENAS_TREASURY_WALLET_ADDRESS = "0x2222222222222222222222222222222222222222";
  process.env.ADMIN_TOKEN = "test_admin_token";

  const store = await import("@/db/store");
  const { createMaecenasServer } = await import("@/http");
  const { circlePaymentRequired } = await import("@/payments/circle-gateway");
  await store.initializeDatabase();
  await store.resetDatabaseForTests();
  await store.seedDatabase();

  const server = createMaecenasServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const sessionId = "sess_acceptance_001";
  const account = privateKeyToAccount("0x1111111111111111111111111111111111111111111111111111111111111111");
  const walletAddress = account.address.toLowerCase();
  let walletAuth = "";

  const circleRequirement = circlePaymentRequired("0.01", process.env.MAECENAS_TREASURY_WALLET_ADDRESS, `${base}/paid`);
  assert.equal(circleRequirement.accepts[0].amount, "10000");
  assert.equal(circleRequirement.accepts[0].network, "eip155:5042002");

  const post = async (route: string, body: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(`${base}${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(walletAuth ? { Authorization: `Bearer ${walletAuth}` } : {}),
        ...headers
      },
      body: JSON.stringify(body)
    });
    return { response, body: (await response.json()) as Record<string, any> };
  };

  try {
    const challenge = await post("/api/auth/nonce", { walletAddress });
    const signature = await account.signMessage({ message: challenge.body.message });
    const authentication = await post("/api/auth/verify", {
      walletAddress,
      nonceId: challenge.body.id,
      signature
    });
    assert.equal(authentication.response.status, 200);
    walletAuth = authentication.body.token;

    const nativeFetch = globalThis.fetch;
    let gatewaySettlementCalls = 0;
    let loseGatewayResponse = false;
    globalThis.fetch = async (input, init) => {
      if (String(input) === "https://gateway-api-testnet.circle.com/v1/x402/settle") {
        gatewaySettlementCalls += 1;
        if (loseGatewayResponse) throw new Error("simulated connection loss after submission");
        return new Response(JSON.stringify({
          success: true,
          transaction: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          network: "eip155:5042002",
          payer: walletAddress
        }));
      }
      return nativeFetch(input, init);
    };
    try {
      process.env.PAYMENT_MODE = "real";
      const realIntent = await post("/api/payments/search-intent", { sessionId, walletAddress, usePaidSearch: true });
      const realProof = await post("/api/payments/search-proof", {
        paymentIntentId: realIntent.body.paymentIntentId,
        sessionId,
        walletAddress,
        paymentPayload: { x402Version: 2, payload: { nonce: "first" } }
      });
      const realRetry = await post("/api/payments/search-proof", {
        paymentIntentId: realIntent.body.paymentIntentId,
        sessionId,
        walletAddress,
        paymentPayload: { x402Version: 2, payload: { nonce: "different" } }
      });
      assert.equal(realRetry.body.searchPaymentId, realProof.body.searchPaymentId);
      assert.equal(gatewaySettlementCalls, 1);

      const uncertainSessionId = "sess_uncertain_payment";
      const uncertainIntent = await post("/api/payments/search-intent", { sessionId: uncertainSessionId, walletAddress, usePaidSearch: true });
      loseGatewayResponse = true;
      const uncertain = await post("/api/payments/search-proof", {
        paymentIntentId: uncertainIntent.body.paymentIntentId,
        sessionId: uncertainSessionId,
        walletAddress,
        paymentPayload: { x402Version: 2, payload: { nonce: "unknown" } }
      });
      assert.equal(uncertain.response.status, 500);
      const blockedRetry = await post("/api/payments/search-proof", {
        paymentIntentId: uncertainIntent.body.paymentIntentId,
        sessionId: uncertainSessionId,
        walletAddress,
        paymentPayload: { x402Version: 2, payload: { nonce: "must-not-settle" } }
      });
      assert.equal(blockedRetry.response.status, 409);
      assert.equal(blockedRetry.body.error, "PAYMENT_SETTLEMENT_STATUS_UNKNOWN");
      assert.equal(gatewaySettlementCalls, 2);
    } finally {
      globalThis.fetch = nativeFetch;
      process.env.PAYMENT_MODE = "mock";
    }

    const earlyPaidIntent = await store.createSearchPaymentIntent(sessionId, walletAddress, true);
    const earlyPaidPayment = await store.confirmSearchPayment({
      paymentIntentId: earlyPaidIntent.id,
      sessionId,
      walletAddress,
      paymentProof: "mock_early_paid_search"
    });
    const earlyPaidRun = await store.beginResearch({
      sessionId,
      walletAddress,
      searchPaymentId: earlyPaidPayment.id,
      clientRequestId: "request_early_paid",
      question: "Use wallet funding before consuming a patron grant",
      strategy: "balanced"
    });
    assert.equal(earlyPaidRun.kind, "started");
    if (earlyPaidRun.kind === "started") {
      assert.equal(earlyPaidRun.paymentType, "user_paid");
      await store.failResearch(earlyPaidRun.runId);
    }
    assert.equal((await store.getUsageBySession(sessionId))?.freeSearchesUsed, 0);

    const sourceUrl = "https://example.org/independent-nanopayment-evidence";
    const ownershipAttestation = await account.signMessage({
      message: [
        "Maecenas source ownership attestation",
        `Wallet: ${walletAddress}`,
        `Source: ${sourceUrl}`,
        "I attest that I control or am authorized to register this research source."
      ].join("\n")
    });

    const submitted = await post("/api/sources", {
      title: "Independent Nanopayment Evidence",
      authorName: "Test Source Owner",
      sourceUrl,
      walletAddress,
      citationPriceUSDC: "0.0001",
      abstract: "Independent evidence about nanopayment authorization, settlement, and accountable source compensation.",
      evidenceText:
        "Nanopayment authorization lets software purchase one narrowly scoped evidence item while preserving a receipt that identifies the buyer, source owner, amount, and funded research session.",
      tags: "nanopayments, evidence, authorization",
      ownershipAttestation
    });
    assert.equal(submitted.response.status, 201);
    assert.equal(submitted.body.source.status, "pending");
    assert.equal(submitted.body.source.evidenceText, undefined);
    const publicSourcesBefore = (await (await fetch(`${base}/api/sources`)).json()) as Record<string, any>;
    assert.equal(publicSourcesBefore.pagination.page, 1);
    assert.equal(publicSourcesBefore.pagination.pageSize, 24);
    assert.ok(publicSourcesBefore.items.every((source: Record<string, unknown>) => !("evidenceText" in source)));
    assert.ok(!publicSourcesBefore.items.some((source: Record<string, unknown>) => source.id === submitted.body.source.id));
    const ownerSources = (await (
      await fetch(`${base}/api/sources?wallet=${walletAddress}`, {
        headers: { Authorization: `Bearer ${walletAuth}` }
      })
    ).json()) as Record<string, any>;
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
    const attempt = await store.reserveEvidencePaymentAttempt({
      paymentScope: "test-payment-scope",
      sourceId: submitted.body.source.id,
      amountUSDC: "0.0001",
      recipientWallet: walletAddress
    });
    assert.equal(attempt.status, "pending");
    await assert.rejects(
      () => store.reserveEvidencePaymentAttempt({
        paymentScope: "test-payment-scope",
        sourceId: submitted.body.source.id,
        amountUSDC: "0.0001",
        recipientWallet: walletAddress
      }),
      (error: unknown) => error instanceof store.StoreError && error.code === "EVIDENCE_PAYMENT_STATUS_UNKNOWN"
    );
    await store.failEvidencePaymentAttempt(attempt.id);
    const retryAttempt = await store.reserveEvidencePaymentAttempt({
      paymentScope: "test-payment-scope",
      sourceId: submitted.body.source.id,
      amountUSDC: "0.0001",
      recipientWallet: walletAddress
    });
    const completedAttempt = await store.completeEvidencePaymentAttempt({
      id: retryAttempt.id,
      paymentId: "gateway-payment-id",
      payerWallet: "0x2222222222222222222222222222222222222222",
      network: "eip155:5042002",
      evidence: {
        id: submitted.body.source.id,
        title: "Independent Nanopayment Evidence",
        authorName: "Test Source Owner",
        evidenceText: "Durably recorded protected evidence."
      }
    });
    assert.equal(completedAttempt.status, "paid");
    assert.equal((await store.reserveEvidencePaymentAttempt({
      paymentScope: "test-payment-scope",
      sourceId: submitted.body.source.id,
      amountUSDC: "0.0001",
      recipientWallet: walletAddress
    })).paymentId, "gateway-payment-id");
    const firstPage = (await (await fetch(`${base}/api/sources?page=1&pageSize=3`)).json()) as Record<string, any>;
    const secondPage = (await (await fetch(`${base}/api/sources?page=2&pageSize=3`)).json()) as Record<string, any>;
    assert.equal(firstPage.pagination.totalItems, 11);
    assert.equal(firstPage.pagination.totalPages, 4);
    assert.equal(firstPage.pagination.hasNextPage, true);
    assert.equal(firstPage.pagination.hasPreviousPage, false);
    assert.equal(firstPage.items[0].id, submitted.body.source.id);
    assert.equal(firstPage.items.length, 3);
    assert.equal(secondPage.pagination.hasPreviousPage, true);
    assert.ok(firstPage.items.every((source: Record<string, unknown>) => !("evidenceText" in source) && !("ownershipAttestation" in source)));
    assert.ok(firstPage.items.every((source: Record<string, unknown>) => !secondPage.items.some((other: Record<string, unknown>) => other.id === source.id)));
    const cappedPage = (await (await fetch(`${base}/api/sources?pageSize=999`)).json()) as Record<string, any>;
    assert.equal(cappedPage.pagination.pageSize, 100);
    const emptyPage = (await (await fetch(`${base}/api/sources?page=999&pageSize=3`)).json()) as Record<string, any>;
    assert.deepEqual(emptyPage.items, []);
    assert.equal(emptyPage.pagination.hasNextPage, false);
    assert.equal(emptyPage.pagination.hasPreviousPage, true);
    const publicSource = (await (await fetch(`${base}/api/sources/${submitted.body.source.id}`)).json()) as Record<string, any>;
    assert.equal(publicSource.source.evidenceText, undefined);
    const guessedProof = await fetch(`${base}/api/sources/${submitted.body.source.id}/evidence?proof=proof:${submitted.body.source.id}`);
    assert.equal(guessedProof.status, 402);
    const duplicate = await post("/api/sources", {
      title: "Duplicate",
      authorName: "Test Source Owner",
      sourceUrl,
      walletAddress,
      citationPriceUSDC: "0.0001",
      abstract: "A duplicate source submission with enough abstract text to pass normal input validation.",
      evidenceText:
        "This evidence body is intentionally long enough to pass validation while reusing the same canonical source URL.",
      tags: "duplicate, evidence",
      ownershipAttestation
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
    assert.equal(paid.body.budget.max, "0.007");
    assert.ok(paid.body.receipts.every((receipt: Record<string, unknown>) => receipt.fundedBy === "user_paid_search"));
    assert.ok(paid.body.receipts.every((receipt: Record<string, unknown>) => receipt.receiptSignature));
    const receiptVerification = await fetch(`${base}/api/receipts/${paid.body.receipts[0].id}/verify`);
    assert.equal((await receiptVerification.json() as Record<string, unknown>).valid, true);

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

    const secondIntent = await store.createSearchPaymentIntent(sessionId, walletAddress);
    const secondPayment = await store.confirmSearchPayment({
      paymentIntentId: secondIntent.id,
      sessionId,
      walletAddress,
      paymentProof: "mock_second_payment"
    });
    const failedPaidRun = await store.beginResearch({
      sessionId,
      walletAddress,
      searchPaymentId: secondPayment.id,
      clientRequestId: "request_paid_failure",
      question: "This paid run fails after reservation",
      strategy: "balanced"
    });
    assert.equal(failedPaidRun.kind, "started");
    if (failedPaidRun.kind === "started") await store.failResearch(failedPaidRun.runId);
    assert.equal((await store.getSearchPayment(secondPayment.id))?.usedForAnswerId, undefined);
    const paidRetry = await store.beginResearch({
      sessionId,
      walletAddress,
      searchPaymentId: secondPayment.id,
      clientRequestId: "request_paid_retry",
      question: "This paid run fails after reservation",
      strategy: "balanced"
    });
    assert.equal(paidRetry.kind, "started");
    if (paidRetry.kind === "started") await store.failResearch(paidRetry.runId);

    const usageResponse = await fetch(`${base}/api/usage?sessionId=${sessionId}&wallet=${walletAddress}`, {
      headers: { Authorization: `Bearer ${walletAuth}` }
    });
    const usage = (await usageResponse.json()) as Record<string, unknown>;
    assert.equal(usage.freeSearchesUsed, 5);
    assert.equal(usage.paidSearchesUsed, 1);

    const failedSession = "sess_failure_001";
    const run = await store.beginResearch({
      sessionId: failedSession,
      clientRequestId: "request_failure_001",
      question: "This run fails after reservation",
      strategy: "balanced"
    });
    assert.equal(run.kind, "started");
    if (run.kind === "started") await store.failResearch(run.runId);
    assert.equal((await store.getUsageBySession(failedSession))?.freeSearchesUsed, 0);

    const concurrentSession = "sess_concurrent_001";
    const reservations = await Promise.all(Array.from({ length: 5 }, (_, index) =>
      store.beginResearch({
        sessionId: concurrentSession,
        clientRequestId: `request_concurrent_${index}`,
        question: "Reserve one free quota slot",
        strategy: "balanced"
      })
    ));
    await assert.rejects(
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
      if (reservation.kind === "started") await store.failResearch(reservation.runId);
    }

    process.env.RESEARCH_ASYNC = "true";
    const queued = await post("/api/research", {
      sessionId: "sess_queued_001",
      clientRequestId: "request_queued_001",
      question: "Can a worker complete this research?",
      strategy: "balanced"
    });
    assert.equal(queued.response.status, 202);
    let queuedResult: Record<string, any> = queued.body;
    for (let attempt = 0; attempt < 20 && queuedResult.status === "processing"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const response = await fetch(`${base}/api/research/runs/${queued.body.runId}?sessionId=sess_queued_001`);
      queuedResult = await response.json() as Record<string, any>;
    }
    assert.equal(queuedResult.status, "completed");
    assert.ok(queuedResult.answerId);
    delete process.env.RESEARCH_ASYNC;

    delete process.env.AI_MODE;
    const unconfigured = await post("/api/research", {
      sessionId: "sess_no_ai_key_001",
      clientRequestId: "request_no_ai_key",
      question: "Can this return a canned answer?",
      strategy: "balanced"
    });
    assert.equal(unconfigured.response.status, 503);
    assert.equal(unconfigured.body.error, "AI_NOT_CONFIGURED");
    assert.equal((await store.getUsageBySession("sess_no_ai_key_001"))?.freeSearchesUsed, 0);
    process.env.AI_MODE = "test";
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await store.closeDatabase();
  }
});
