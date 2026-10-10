import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import postgres from "postgres";
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
    let providerStatus = "received";
    let providerAmount = "10000";
    const batchHash = `0x${"ab".repeat(32)}`;
    globalThis.fetch = async (input, init) => {
      if (String(input) === "https://gateway-api-testnet.circle.com/v1/x402/transfers/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") {
        return new Response(JSON.stringify({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: providerStatus,
          token: "USDC", sendingNetwork: "eip155:5042002", recipientNetwork: "eip155:5042002",
          fromAddress: walletAddress, toAddress: "0x2222222222222222222222222222222222222222",
          amount: providerAmount, txHash: providerStatus === "received" ? null : batchHash,
          updatedAt: new Date().toISOString(), privateField: "must-not-leak"
        }));
      }
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
      const savedPayment = await store.getSearchPayment(realProof.body.searchPaymentId);
      assert.equal(savedPayment?.network, "eip155:5042002");
      assert.equal(savedPayment?.recipientWallet, "0x2222222222222222222222222222222222222222");
      // Public verification uses payment-time values, even after treasury configuration changes.
      process.env.MAECENAS_TREASURY_WALLET_ADDRESS = "0x3333333333333333333333333333333333333333";
      for (const status of ["received", "batched", "confirmed", "completed", "failed"]) {
        providerStatus = status;
        const publicProof = await fetch(`${base}/api/payments/${savedPayment!.id}/verify`);
        assert.equal(publicProof.status, 200);
        const body = await publicProof.json() as Record<string, any>;
        assert.equal(body.settlement.verification, "matched");
        assert.equal(body.settlement.transfer.status, status);
        assert.equal(body.settlement.batchExplorerUrl, status === "received" ? undefined : `https://testnet.arcscan.app/tx/${batchHash}`);
        assert.equal(body.settlement.transfer.privateField, undefined);
        assert.equal(body.paymentProof, undefined);
        assert.equal(body.sessionId, undefined);
      }
      providerAmount = "10001";
      const mismatch = await (await fetch(`${base}/api/payments/${savedPayment!.id}/verify?amount=10001`)).json() as Record<string, any>;
      assert.equal(mismatch.settlement.verification, "mismatch", "Client expectations cannot override saved amounts");
      assert.equal(mismatch.settlement.batchExplorerUrl, undefined);
      process.env.MAECENAS_TREASURY_WALLET_ADDRESS = "0x2222222222222222222222222222222222222222";
      assert.equal((await store.getSearchPayment(savedPayment!.id))?.status, "paid", "Verification must not mutate payment accounting");
      assert.equal((await fetch(`${base}/api/payments/nonexistent/verify`)).status, 404);

      const networkIntent = await store.createSearchPaymentIntent("sess_network_mismatch", walletAddress, true);
      const networkReservation = await store.reserveSearchPayment({
        paymentIntentId: networkIntent.id, sessionId: "sess_network_mismatch", walletAddress,
        paymentProof: "{}", network: "eip155:5042002", recipientWallet: savedPayment!.recipientWallet!
      });
      await assert.rejects(() => store.completeReservedSearchPayment({
        searchPaymentId: networkReservation.id, walletAddress,
        settlement: { payer: walletAddress, transaction: savedPayment!.paymentId!, network: "eip155:5042" }
      }), (error: unknown) => error instanceof store.StoreError && error.code === "PAYMENT_NETWORK_MISMATCH");
      assert.equal((await store.getSearchPayment(networkReservation.id))?.status, "pending");

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
    const pendingSearch = await (await fetch(`${base}/api/sources?q=Independent%20Nanopayment%20Evidence`)).json() as Record<string, any>;
    assert.equal(pendingSearch.pagination.totalItems, 0, "Search cannot expose unapproved sources");
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
    for (const query of ["INDEPENDENT NANOPAYMENT EVIDENCE", "Test Source Owner", "accountable source compensation", "authorization"]) {
      const result = await (await fetch(`${base}/api/sources?q=${encodeURIComponent(query)}&pageSize=100`)).json() as Record<string, any>;
      assert.ok(result.items.some((source: Record<string, any>) => source.id === submitted.body.source.id), query);
      assert.equal(result.items.length, result.pagination.totalItems);
      assert.ok(result.items.every((source: Record<string, unknown>) => !("evidenceText" in source)));
    }
    const searchPageTwo = await (await fetch(`${base}/api/sources?q=Independent%20Nanopayment%20Evidence&page=2&pageSize=1`)).json() as Record<string, any>;
    assert.equal(searchPageTwo.pagination.totalItems, 1);
    assert.deepEqual(searchPageTwo.items, []);
    for (const query of ["%", "_", "\\", "no-source-matches-this-string"]) {
      const result = await (await fetch(`${base}/api/sources?q=${encodeURIComponent(query)}`)).json() as Record<string, any>;
      assert.equal(result.pagination.totalItems, 0, "LIKE metacharacters must be literal");
    }
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
    const verifiedReceipt = await receiptVerification.json() as Record<string, any>;
    assert.equal(verifiedReceipt.valid, true);
    assert.equal(verifiedReceipt.settlement.verification, "mock");
    assert.equal(verifiedReceipt.settlement.batchExplorerUrl, undefined);
    assert.equal((await fetch(`${base}/api/receipts/nonexistent/verify`)).status, 404);
    const publicMockPayment = await (await fetch(`${base}/api/payments/${proof.body.searchPaymentId}/verify`)).json() as Record<string, any>;
    assert.equal(publicMockPayment.settlement.verification, "mock");
    const paidAnswer = await (await fetch(`${base}/api/answers/${paid.body.answerId}`)).json() as Record<string, any>;
    assert.equal(paidAnswer.commissionPayment.id, proof.body.searchPaymentId);
    assert.equal(paidAnswer.commissionPayment.network, undefined, "Do not invent historical network from current config");
    assert.equal(paidAnswer.commissionPayment.recipientWallet, undefined);

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

    // A shared treasury must reserve across different sessions and retain uncertain payouts.
    const { parseUSDCMicros: toMicros, microsToUSDC: fromMicros } = await import("@/utils/money");
    const sponsoredSpent = (await store.readDb()).receipts
      .filter((receipt) => receipt.fundedBy === "maecenas_sponsored")
      .reduce((total, receipt) => total + toMicros(receipt.amountUSDC), 0);
    const previousLimit = process.env.SPONSORED_TREASURY_LIMIT_USDC;
    process.env.SPONSORED_TREASURY_LIMIT_USDC = fromMicros(sponsoredSpent + 100);
    process.env.FREE_SEARCH_BUDGET_USDC = "0.0001";
    try {
      const requests = [0, 1, 2].map((index) => ({
        sessionId: `sess_treasury_${index}`, clientRequestId: "shared_treasury_request",
        question: "Reserve the last sponsored funds", strategy: "balanced", ipHash: `ip-${index}`
      }));
      const results = await Promise.allSettled(requests.map((request) => store.beginResearch(request)));
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      for (const result of results) {
        if (result.status === "rejected") assert.equal(result.reason.code, "MISSING_WALLET_ADDRESS");
      }
      const winnerIndex = results.findIndex((result) => result.status === "fulfilled");
      const winner = results[winnerIndex];
      assert.ok(winner.status === "fulfilled" && winner.value.kind === "started");
      const request = requests[winnerIndex];
      const attempt = await store.reserveEvidencePaymentAttempt({
        paymentScope: `${request.sessionId}:${request.clientRequestId}`,
        sourceId: submitted.body.source.id, amountUSDC: "0.0001", recipientWallet: walletAddress
      });
      await store.failResearch(winner.value.runId);
      const nextRequest = { ...request, sessionId: "sess_treasury_next", ipHash: "ip-next" };
      await assert.rejects(() => store.beginResearch(nextRequest), /Wallet address is required/);
      await store.completeEvidencePaymentAttempt({
        id: attempt.id, paymentId: "sponsored-paid-before-failure", payerWallet: walletAddress,
        network: "eip155:5042002",
        evidence: { id: submitted.body.source.id, title: "Evidence", authorName: "Author", evidenceText: "Evidence" }
      });
      await assert.rejects(() => store.beginResearch(nextRequest), /Wallet address is required/);
    } finally {
      if (previousLimit === undefined) delete process.env.SPONSORED_TREASURY_LIMIT_USDC;
      else process.env.SPONSORED_TREASURY_LIMIT_USDC = previousLimit;
      process.env.FREE_SEARCH_BUDGET_USDC = "0.01";
    }

    const previousArcEnvironment = process.env.ARC_ENVIRONMENT;
    process.env.PAYMENT_MODE = "real";
    try {
      await assert.rejects(() => store.beginResearch({
        sessionId, walletAddress, searchPaymentId: secondPayment.id,
        clientRequestId: "mock_payment_on_mainnet", question: "This paid run fails after reservation", strategy: "balanced"
      }), (error: unknown) => error instanceof store.StoreError && error.code === "SEARCH_PAYMENT_ENVIRONMENT_MISMATCH");
      const testnetPayment = (await store.readDb()).searchPayments.find((payment) => payment.paymentMode === "real" && payment.status === "paid")!;
      assert.ok(testnetPayment);
      process.env.ARC_ENVIRONMENT = "mainnet";
      await assert.rejects(() => store.beginResearch({
        sessionId: testnetPayment.sessionId, walletAddress, searchPaymentId: testnetPayment.id,
        clientRequestId: "testnet_payment_on_mainnet", question: "Testnet funds cannot buy mainnet evidence", strategy: "balanced"
      }), (error: unknown) => error instanceof store.StoreError && error.code === "SEARCH_PAYMENT_ENVIRONMENT_MISMATCH");
    } finally {
      process.env.PAYMENT_MODE = "mock";
      if (previousArcEnvironment === undefined) delete process.env.ARC_ENVIRONMENT;
      else process.env.ARC_ENVIRONMENT = previousArcEnvironment;
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

    // Exercise paid receipt verification and nullable legacy columns using only the isolated test DB.
    const db = postgres(process.env.TEST_DATABASE_URL!, { ssl: false, max: 1 });
    const { signReceipt } = await import("@/security");
    const { parseUSDCMicros } = await import("@/utils/money");
    const originalReceipt = (await store.findReceipt(paid.body.receipts[0].id))!;
    const paidReceipt = {
      ...originalReceipt, status: "paid" as const, payerWallet: walletAddress,
      network: "eip155:5042002", paymentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", txHash: undefined
    };
    const receiptSignature = signReceipt(paidReceipt);
    const lookup = `${base}/api/receipts/${paidReceipt.id}/verify`;
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (String(input).startsWith("https://gateway-api-testnet.circle.com/v1/x402/transfers/")) {
        return new Response(JSON.stringify({
          id: paidReceipt.paymentId, status: "completed", token: "USDC",
          sendingNetwork: paidReceipt.network, recipientNetwork: paidReceipt.network,
          fromAddress: walletAddress, toAddress: paidReceipt.recipientWallet,
          amount: String(parseUSDCMicros(paidReceipt.amountUSDC)), txHash: batchHash,
          updatedAt: new Date().toISOString()
        }));
      }
      return previousFetch(input, init);
    };
    try {
      await db`UPDATE citation_payments SET status = 'paid', payer_wallet = ${walletAddress},
        network = ${paidReceipt.network}, payment_id = ${paidReceipt.paymentId}, tx_hash = NULL,
        receipt_signature = ${receiptSignature} WHERE id = ${paidReceipt.id}`;
      const verified = await (await fetch(lookup)).json() as Record<string, any>;
      assert.equal(verified.valid, true);
      assert.equal(verified.settlement.verification, "matched");
      assert.equal(verified.settlement.transfer.status, "completed");
      await db`UPDATE citation_payments SET receipt_signature = 'tampered' WHERE id = ${paidReceipt.id}`;
      const tampered = await (await fetch(lookup)).json() as Record<string, any>;
      assert.equal(tampered.valid, false, "Receipt integrity must remain independent of Circle matching");
      assert.equal(tampered.settlement.verification, "matched");
      await db`UPDATE citation_payments SET receipt_signature = ${receiptSignature} WHERE id = ${paidReceipt.id}`;

      await db`UPDATE search_payments SET network = NULL, recipient_wallet = NULL WHERE id = ${proof.body.searchPaymentId}`;
      const legacyMock = await store.getSearchPayment(proof.body.searchPaymentId);
      assert.equal(legacyMock?.network, undefined);
      assert.equal(legacyMock?.recipientWallet, undefined);
      const [legacy] = await db`SELECT id FROM search_payments WHERE status = 'paid' LIMIT 1`;
      await db`UPDATE search_payments SET network = NULL, recipient_wallet = NULL WHERE id = ${legacy!.id}`;
      const incomplete = await (await fetch(`${base}/api/payments/${legacy!.id}/verify`)).json() as Record<string, any>;
      assert.equal(incomplete.settlement.verification, "incomplete");
      const historicalPayload = JSON.stringify({
        accepted: { scheme: "exact", network: "eip155:5042002", payTo: paidReceipt.recipientWallet, amount: "10000" },
        payload: { authorization: { from: walletAddress, to: paidReceipt.recipientWallet, value: "10000" } }
      });
      await db`UPDATE search_payments SET payment_proof = ${historicalPayload} WHERE id = ${legacy!.id}`;
      const recovered = await store.getSearchPayment(legacy!.id);
      assert.equal(recovered?.network, "eip155:5042002");
      assert.equal(recovered?.recipientWallet, paidReceipt.recipientWallet);
    } finally {
      globalThis.fetch = previousFetch;
      await db.end();
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await store.closeDatabase();
  }
});
