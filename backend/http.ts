import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { createHmac, timingSafeEqual } from "crypto";
import { URL } from "url";
import { runResearchAgent } from "@/agent/research-agent";
import { activeEvents, enqueueResearch, researchQueueStatus } from "@/agent/research-worker";
import { AgentError } from "@/agent/ai";
import { buildLeaderboard, completedReceipts, type PaymentMode } from "@/analytics/leaderboard";
import {
  beginResearch,
  completeResearch,
  confirmSearchPayment,
  consumeWalletAuthNonce,
  createWalletAuthNonce,
  createSearchPaymentIntent,
  createSource,
  failResearch,
  findAnswer,
  findReceipt,
  findSource,
  getOrCreateUsage,
  getResearchRunStatus,
  getSearchPaymentIntent,
  listSources,
  readDb,
  reviewSource,
  StoreError
} from "@/db/store";
import { buildPaymentRequired, hasValidPaymentProof } from "@/payments/payment-executor";
import { circlePaymentRequired, settleCirclePayment } from "@/payments/circle-gateway";
import { createAuthToken, sourceOwnershipMessage, verifyReceiptSignature, verifyToken, verifyWalletSignature } from "@/security";
import type { Answer, PublicSource, ResearchStrategy, Source, UserUsage } from "@/types";
import { makeId } from "@/utils/ids";
import { microsToUSDC, parseUSDCMicros, sumUSDC } from "@/utils/money";

type RouteContext = {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  method: string;
  path: string;
};

const strategies = new Set(["conservative", "balanced", "aggressive"]);
const sessionIdPattern = /^[A-Za-z0-9_-]{8,128}$/;
const walletPattern = /^0x[a-f0-9]{40}$/;
const startedAt = Date.now();
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const metrics = {
  requests: 0,
  errors: 0,
  researchRequests: 0,
  rateLimited: 0
};

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function createMaecenasServer() {
  return createServer(async (request, response) => {
    const requestStartedAt = Date.now();
    const requestId = makeId("http");
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const context: RouteContext = {
      request,
      response,
      url,
      method: request.method ?? "GET",
      path: url.pathname
    };

    setCorsHeaders(request, response);
    response.setHeader("X-Request-Id", requestId);
    response.once("finish", () => {
      console.log(JSON.stringify({
        level: "info",
        requestId,
        method: context.method,
        path: context.path,
        status: response.statusCode,
        durationMs: Date.now() - requestStartedAt
      }));
    });
    metrics.requests += 1;

    if (context.method === "OPTIONS") {
      return sendJson(response, 204, {});
    }

    try {
      enforceRateLimit(request, response, context.path === "/api/research" ? "research" : "api");
      if (context.path === "/api/research") metrics.researchRequests += 1;
      await routeRequest(context);
    } catch (error) {
      metrics.errors += 1;
      if (error instanceof StoreError) {
        return sendJson(response, error.status, { error: error.code, message: error.message });
      }
      if (error instanceof HttpError) {
        return sendJson(response, error.status, { error: error.code, message: error.message });
      }
      if (error instanceof SyntaxError) {
        return sendJson(response, 400, { error: "INVALID_JSON", message: "Request body must be valid JSON" });
      }
      console.error(error);
      sendJson(response, 500, { error: "INTERNAL_SERVER_ERROR", message: "Internal server error" });
    }
  });
}

async function routeRequest(context: RouteContext) {
  const { method, path, response, url, request } = context;

  if (method === "GET" && path === "/api/health") {
    const snapshot = await readDb();
    return sendJson(response, 200, {
      ok: true,
      service: "maecenas-backend",
      version: "0.2.0",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      database: "supabase-postgres",
      paymentMode: process.env.PAYMENT_MODE === "real" ? "real" : "mock",
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      records: {
        sources: snapshot.sources.length,
        answers: snapshot.answers.length,
        receipts: snapshot.receipts.length
      }
    });
  }

  if (method === "GET" && path === "/api/admin/metrics") {
    requireAdmin(request);
    return sendJson(response, 200, {
      ...metrics,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      activeRateLimitKeys: rateLimits.size
      ,
      researchQueue: researchQueueStatus()
    });
  }

  if (method === "GET" && path === "/api/sources") {
    const walletAddress = optionalWallet(url.searchParams.get("wallet"));
    if (walletAddress) requireWalletAuth(request, walletAddress);
    return sendJson(response, 200, { sources: (await listSources({ walletAddress })).map(publicSource) });
  }

  if (method === "POST" && path === "/api/auth/nonce") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const walletAddress = requireWallet(body.walletAddress);
    return sendJson(response, 201, await createWalletAuthNonce(walletAddress));
  }

  if (method === "POST" && path === "/api/auth/verify") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const walletAddress = requireWallet(body.walletAddress);
    const nonceId = String(body.nonceId ?? "");
    const signature = String(body.signature ?? "");
    const message = await consumeWalletAuthNonce(nonceId, walletAddress);
    if (!(await verifyWalletSignature(walletAddress, message, signature))) {
      throw new HttpError(401, "INVALID_WALLET_SIGNATURE", "Wallet signature could not be verified");
    }
    return sendJson(response, 200, {
      walletAddress,
      token: createAuthToken(walletAddress),
      expiresInSeconds: Number(process.env.AUTH_SESSION_HOURS ?? 24) * 3600
    });
  }

  if (method === "GET" && path === "/api/admin/sources") {
    requireAdmin(request);
    const status = url.searchParams.get("status");
    const allSources = await listSources({ includeUnapproved: true });
    return sendJson(response, 200, {
      sources: (status ? allSources.filter((source) => source.status === status) : allSources).map(adminSource)
    });
  }

  if (method === "GET" && path === "/api/usage") {
    const sessionId = requireSessionId(url.searchParams.get("sessionId"));
    const walletAddress = optionalWallet(url.searchParams.get("wallet"));
    if (walletAddress) requireWalletAuth(request, walletAddress);
    const usage = await getOrCreateUsage(sessionId, walletAddress, ipHash(request));
    return sendJson(response, 200, usageResponse(usage));
  }

  if (method === "POST" && path === "/api/sources") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const authenticatedWallet = requireWalletAuth(request);
    const required = ["title", "authorName", "sourceUrl", "citationPriceUSDC", "abstract", "evidenceText"];
    const missing = required.filter((field) => !body[field]);
    if (missing.length > 0) {
      return sendJson(response, 400, { error: `Missing required fields: ${missing.join(", ")}` });
    }

    const title = String(body.title).trim();
    const authorName = String(body.authorName).trim();
    const abstract = String(body.abstract).trim();
    const evidenceText = String(body.evidenceText).trim();
    const sourceUrl = requireHttpUrl(body.sourceUrl, "sourceUrl");
    const ownershipAttestation = String(body.ownershipAttestation ?? "");
    if (!(await verifyWalletSignature(authenticatedWallet, sourceOwnershipMessage(authenticatedWallet, sourceUrl), ownershipAttestation))) {
      throw new HttpError(401, "INVALID_SOURCE_ATTESTATION", "Sign the source ownership attestation before submitting");
    }
    if (title.length > 200 || authorName.length > 120) {
      throw new HttpError(400, "INVALID_SOURCE", "Source title or author name is too long");
    }
    if (abstract.length < 40 || abstract.length > 2_000 || evidenceText.length < 80 || evidenceText.length > 20_000) {
      throw new HttpError(400, "INVALID_SOURCE", "Abstract or evidence length is outside the accepted range");
    }
    const tags = String(body.tags ?? "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    if (tags.length === 0) throw new HttpError(400, "INVALID_SOURCE", "At least one tag is required");

    const source: Source = {
      id: makeId("src"),
      title,
      authorName,
      sourceUrl,
      doiOrCanonicalUrl: body.doiOrCanonicalUrl
        ? requireHttpUrlOrDoi(body.doiOrCanonicalUrl, "doiOrCanonicalUrl")
        : undefined,
      walletAddress: authenticatedWallet,
      citationPriceUSDC: String(body.citationPriceUSDC),
      abstract,
      evidenceText,
      tags,
      license: body.license ? String(body.license) : undefined,
      status: "pending",
      ownershipAttestation,
      createdAt: new Date().toISOString()
    };

    validateUSDC(source.citationPriceUSDC, "citationPriceUSDC");
    if (parseUSDCMicros(source.citationPriceUSDC) === 0) {
      throw new HttpError(400, "INVALID_USDC_AMOUNT", "citationPriceUSDC must be greater than zero");
    }
    return sendJson(response, 201, { source: publicSource(await createSource(source)) });
  }

  const sourceReviewMatch = path.match(/^\/api\/admin\/sources\/([^/]+)\/review$/);
  if (method === "POST" && sourceReviewMatch) {
    requireAdmin(request);
    const body = await readJsonBody<Record<string, unknown>>(request);
    const status = String(body.status ?? "");
    if (status !== "approved" && status !== "rejected") {
      throw new HttpError(400, "INVALID_SOURCE_STATUS", "status must be approved or rejected");
    }
    return sendJson(response, 200, {
      source: publicSource(await reviewSource(sourceReviewMatch[1], status, body.reason ? String(body.reason) : undefined))
    });
  }

  const sourcePreviewMatch = path.match(/^\/api\/sources\/([^/]+)\/preview$/);
  if (method === "GET" && sourcePreviewMatch) {
    const source = await findSource(sourcePreviewMatch[1]);
    if (!source || source.status !== "approved") return sendJson(response, 404, { error: "Source not found" });

    return sendJson(response, 200, {
      id: source.id,
      title: source.title,
      authorName: source.authorName,
      abstract: source.abstract,
      tags: source.tags,
      priceUSDC: source.citationPriceUSDC
    });
  }

  const sourceEvidenceMatch = path.match(/^\/api\/sources\/([^/]+)\/evidence$/);
  if (method === "GET" && sourceEvidenceMatch) {
    const source = await findSource(sourceEvidenceMatch[1]);
    if (!source || source.status !== "approved") return sendJson(response, 404, { error: "Source not found" });

    if (process.env.PAYMENT_MODE === "real") {
      const resourceUrl = `${process.env.PUBLIC_BACKEND_URL ?? `http://localhost:${process.env.BACKEND_PORT ?? 4000}`}${path}`;
      const required = circlePaymentRequired(source.citationPriceUSDC, source.walletAddress, resourceUrl);
      const paymentSignature = request.headers["payment-signature"]?.toString();
      if (!paymentSignature) {
        response.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(required)).toString("base64"));
        return sendJson(response, 402, { error: "PAYMENT_REQUIRED" });
      }
      const payload = JSON.parse(Buffer.from(paymentSignature, "base64").toString("utf8")) as unknown;
      const settlement = await settleCirclePayment(payload, required);
      response.setHeader("PAYMENT-RESPONSE", Buffer.from(JSON.stringify(settlement)).toString("base64"));
      return sendJson(response, 200, protectedEvidence(source));
    }

    const proof = request.headers["x-payment-proof"]?.toString() ?? url.searchParams.get("proof");
    if (!hasValidPaymentProof(source, proof)) {
      return sendJson(response, 402, buildPaymentRequired(source));
    }

    return sendJson(response, 200, protectedEvidence(source));
  }

  const sourceMatch = path.match(/^\/api\/sources\/([^/]+)$/);
  if (method === "GET" && sourceMatch) {
    const source = await findSource(sourceMatch[1]);
    if (!source || source.status !== "approved") return sendJson(response, 404, { error: "Source not found" });
    return sendJson(response, 200, { source: publicSource(source) });
  }

  if (method === "POST" && path === "/api/payments/search-intent") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const sessionId = requireSessionId(body.sessionId);
    const walletAddress = requireWallet(body.walletAddress);
    requireWalletAuth(request, walletAddress);
    const intent = await createSearchPaymentIntent(sessionId, walletAddress);
    const recipientWallet = process.env.MAECENAS_TREASURY_WALLET_ADDRESS ?? "";
    const paymentRequired =
      intent.paymentMode === "real"
        ? circlePaymentRequired(intent.amountUSDC, requireWallet(recipientWallet), `${process.env.PUBLIC_BACKEND_URL ?? ""}/api/payments/search-proof`)
        : undefined;
    return sendJson(response, 201, {
      paymentIntentId: intent.id,
      amountUSDC: intent.amountUSDC,
      recipientWallet,
      network: paymentRequired?.accepts[0]?.network ?? process.env.X402_NETWORK ?? "arc-testnet",
      status: intent.status,
      paymentMode: intent.paymentMode,
      expiresAt: intent.expiresAt,
      paymentRequired
    });
  }

  if (method === "POST" && path === "/api/payments/search-proof") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const paymentIntentId = String(body.paymentIntentId ?? "").trim();
    if (!paymentIntentId) throw new HttpError(400, "INVALID_PAYMENT_INTENT", "paymentIntentId is required");
    const sessionId = requireSessionId(body.sessionId);
    const walletAddress = requireWallet(body.walletAddress);
    requireWalletAuth(request, walletAddress);
    const intent = await getSearchPaymentIntent(paymentIntentId);
    if (!intent) throw new HttpError(404, "INVALID_PAYMENT_INTENT", "Payment intent was not found");
    let settlement;
    if (intent.paymentMode === "real") {
      const recipient = requireWallet(process.env.MAECENAS_TREASURY_WALLET_ADDRESS);
      const required = circlePaymentRequired(intent.amountUSDC, recipient, `${process.env.PUBLIC_BACKEND_URL ?? ""}/api/payments/search-proof`);
      const paymentPayload = body.paymentPayload;
      if (!paymentPayload) throw new HttpError(400, "PAYMENT_NOT_CONFIRMED", "paymentPayload is required");
      settlement = await settleCirclePayment(paymentPayload, required);
    }
    const payment = await confirmSearchPayment({
      paymentIntentId,
      sessionId,
      walletAddress,
      paymentProof: settlement ? JSON.stringify(body.paymentPayload) : String(body.paymentProof ?? ""),
      txHash: body.txHash ? String(body.txHash) : undefined
      ,
      settlement: settlement
        ? { payer: settlement.payer ?? "", transaction: settlement.transaction, network: settlement.network }
        : undefined
    });
    return sendJson(response, 200, {
      searchPaymentId: payment.id,
      paymentIntentId: payment.paymentIntentId,
      status: payment.status,
      amountUSDC: payment.amountUSDC,
      paymentMode: payment.paymentMode
    });
  }

  if (method === "POST" && path === "/api/research") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const sessionId = requireSessionId(body.sessionId);
    const question = String(body.question ?? "").trim();
    const requestedBudgetUSDC = body.budgetUSDC === undefined ? undefined : String(body.budgetUSDC);
    const strategy = String(body.strategy ?? "balanced") as ResearchStrategy;
    const walletAddress = optionalWallet(body.walletAddress);
    if (walletAddress) requireWalletAuth(request, walletAddress);
    const searchPaymentId = body.searchPaymentId ? String(body.searchPaymentId) : undefined;
    const clientRequestId = body.clientRequestId ? String(body.clientRequestId).trim() : makeId("req");

    if (!question) return sendJson(response, 400, { error: "Question is required" });
    if (question.length > 10_000) throw new HttpError(400, "INVALID_QUESTION", "Question is too long");
    if (!strategies.has(strategy)) {
      return sendJson(response, 400, { error: "Strategy must be conservative, balanced, or aggressive" });
    }
    if (!sessionIdPattern.test(clientRequestId)) {
      throw new HttpError(400, "INVALID_CLIENT_REQUEST_ID", "clientRequestId must be 8-128 letters, numbers, underscores, or hyphens");
    }
    if (requestedBudgetUSDC !== undefined) validateUSDC(requestedBudgetUSDC, "budgetUSDC");

    let reservation;
    try {
      reservation = await beginResearch({
        sessionId,
        walletAddress,
        searchPaymentId,
        clientRequestId,
        question,
        strategy,
        requestedBudgetUSDC,
        ipHash: ipHash(request)
      });
    } catch (error) {
      if (
        error instanceof StoreError &&
        ["PAYMENT_REQUIRED", "MISSING_WALLET_ADDRESS", "PAYMENT_NOT_CONFIRMED"].includes(error.code)
      ) {
        return sendPaymentRequired(response, sessionId);
      }
      throw error;
    }

    if (reservation.kind === "existing") {
      return sendResearchResponse(response, reservation.answer);
    }

    if (process.env.RESEARCH_ASYNC === "true") {
      enqueueResearch({
        runId: reservation.runId,
        question,
        budgetUSDC: reservation.budgetUSDC,
        strategy,
        sessionId,
        walletAddress,
        searchPaymentId: reservation.searchPaymentId,
        paymentType: reservation.paymentType
      });
      return sendJson(response, 202, {
        runId: reservation.runId,
        status: "processing",
        pollUrl: `/api/research/runs/${reservation.runId}?sessionId=${encodeURIComponent(sessionId)}`
      });
    }

    try {
      const result = await runResearchAgent({
        question,
        budgetUSDC: reservation.budgetUSDC,
        strategy,
        sessionId,
        walletAddress,
        searchPaymentId: reservation.searchPaymentId,
        paymentType: reservation.paymentType
      });
      const answer = await completeResearch(reservation.runId, result.answer, result.receipts);
      return sendResearchResponse(response, answer);
    } catch (error) {
      await failResearch(reservation.runId);
      if (error instanceof AgentError) {
        return sendJson(response, error.status, { error: error.code, message: error.message });
      }
      console.error(error);
      return sendJson(response, 500, { error: "RESEARCH_FAILED", message: "Research could not be completed" });
    }
  }

  const researchRunMatch = path.match(/^\/api\/research\/runs\/([^/]+)$/);
  if (method === "GET" && researchRunMatch) {
    const sessionId = requireSessionId(url.searchParams.get("sessionId"));
    const run = await getResearchRunStatus(researchRunMatch[1], sessionId);
    if (!run) return sendJson(response, 404, { error: "Research run not found" });
    if (run.status === "completed" && run.answer) return sendResearchResponse(response, run.answer);
    const events = activeEvents.get(researchRunMatch[1]) ?? [];
    return sendJson(response, run.status === "failed" ? 500 : 202, {
      runId: researchRunMatch[1],
      status: run.status,
      events,
      error: run.status === "failed" ? "RESEARCH_FAILED" : undefined
    });
  }

  const answerMatch = path.match(/^\/api\/answers\/([^/]+)$/);
  if (method === "GET" && answerMatch) {
    const answer = await findAnswer(answerMatch[1]);
    if (!answer) return sendJson(response, 404, { error: "Answer not found" });
    return sendJson(response, 200, { answer });
  }

  const receiptMatch = path.match(/^\/api\/receipts\/([^/]+)$/);
  if (method === "GET" && receiptMatch) {
    const receipt = await findReceipt(receiptMatch[1]);
    if (!receipt) return sendJson(response, 404, { error: "Receipt not found" });
    return sendJson(response, 200, { receipt });
  }

  const receiptVerifyMatch = path.match(/^\/api\/receipts\/([^/]+)\/verify$/);
  if (method === "GET" && receiptVerifyMatch) {
    const receipt = await findReceipt(receiptVerifyMatch[1]);
    if (!receipt) return sendJson(response, 404, { error: "Receipt not found" });
    return sendJson(response, 200, {
      receiptId: receipt.id,
      valid: verifyReceiptSignature(receipt),
      status: receipt.status,
      network: receipt.network,
      transaction: receipt.txHash
    });
  }

  if (method === "GET" && path === "/api/dashboard") {
    const wallet = requireWallet(url.searchParams.get("wallet"));
    requireWalletAuth(request, wallet);
    const db = await readDb();
    const paymentMode = currentPaymentMode();
    const sources = db.sources.filter((source) => !wallet || source.walletAddress.toLowerCase() === wallet);
    const sourceIds = new Set(sources.map((source) => source.id));
    const receipts = completedReceipts(db.receipts, paymentMode)
      .filter((receipt) => sourceIds.has(receipt.sourceId));
    const topSource = sources
      .map((source) => ({
        source,
        earnedUSDC: sumUSDC(receipts.filter((receipt) => receipt.sourceId === source.id).map((receipt) => receipt.amountUSDC))
      }))
      .sort((a, b) => Number(b.earnedUSDC) - Number(a.earnedUSDC))[0];

    return sendJson(response, 200, {
      paymentMode,
      wallet,
      totalSourcesRegistered: sources.length,
      totalCitationsReceived: receipts.length,
      totalUSDCEarned: sumUSDC(receipts.map((receipt) => receipt.amountUSDC)),
      latestPaidCitations: receipts.slice(0, 10),
      topEarningSource: topSource ?? null
    });
  }

  if (method === "GET" && path === "/api/leaderboard") {
    return sendJson(
      response,
      200,
      buildLeaderboard(await readDb(), currentPaymentMode())
    );
  }

  return sendJson(response, 404, { error: "Not found" });
}

async function sendResearchResponse(response: ServerResponse, answer: Answer) {
  const usage = await getUsageByAnswer(answer);
  const fundedMicros = parseUSDCMicros(answer.budgetUSDC);
  const spentMicros = parseUSDCMicros(answer.spentUSDC);
  return sendJson(response, 200, {
    answerId: answer.id,
    status: "completed",
    paymentType: answer.paymentType,
    searchPaymentId: answer.searchPaymentId,
    freeSearchesRemaining: usage ? Math.max(0, usage.freeSearchLimit - usage.freeSearchesUsed) : undefined,
    budget: {
      fundedUSDC: answer.budgetUSDC,
      max: answer.budgetUSDC,
      spent: answer.spentUSDC,
      remaining: microsToUSDC(Math.max(0, fundedMicros - spentMicros))
    },
    selectedSources: answer.decisionTraceJson.budgetDecision.selectedSources,
    skippedSources: answer.decisionTraceJson.budgetDecision.skippedSources,
    receipts: answer.decisionTraceJson.receipts
  });
}

async function getUsageByAnswer(answer: Answer) {
  return answer.sessionId ? getOrCreateUsage(answer.sessionId, answer.walletAddress) : undefined;
}

async function sendPaymentRequired(response: ServerResponse, sessionId: string) {
  const usage = await getOrCreateUsage(sessionId);
  const price = process.env.PAID_SEARCH_PRICE_USDC ?? "0.01";
  return sendJson(response, 402, {
    error: "PAYMENT_REQUIRED",
    reason: "FREE_QUOTA_EXHAUSTED",
    message: `You have used your ${usage.freeSearchLimit} free Maecenas searches. Connect wallet and pay ${price} test USDC to continue.`,
    freeSearchesUsed: usage.freeSearchesUsed,
    freeSearchLimit: usage.freeSearchLimit,
    paidSearchPriceUSDC: price,
    nextStep: "CREATE_SEARCH_PAYMENT_INTENT"
  });
}

function usageResponse(usage: UserUsage) {
  const remaining = Math.max(0, usage.freeSearchLimit - usage.freeSearchesUsed);
  return {
    sessionId: usage.sessionId,
    walletAddress: usage.walletAddress,
    freeSearchesUsed: usage.freeSearchesUsed,
    freeSearchLimit: usage.freeSearchLimit,
    freeSearchesRemaining: remaining,
    paidSearchesUsed: usage.paidSearchesUsed,
    requiresPayment: remaining === 0,
    paidSearchPriceUSDC: process.env.PAID_SEARCH_PRICE_USDC ?? "0.01",
    paymentMode: process.env.PAYMENT_MODE === "real" ? "real" : "mock"
  };
}

function requireSessionId(value: unknown): string {
  const sessionId = String(value ?? "").trim();
  if (!sessionId) throw new HttpError(400, "MISSING_SESSION_ID", "sessionId is required");
  if (!sessionIdPattern.test(sessionId)) {
    throw new HttpError(400, "MISSING_SESSION_ID", "sessionId must be 8-128 letters, numbers, underscores, or hyphens");
  }
  return sessionId;
}

function currentPaymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === "real" ? "real" : "mock";
}

function requireWallet(value: unknown): string {
  const wallet = String(value ?? "").trim().toLowerCase();
  if (!wallet) throw new HttpError(400, "MISSING_WALLET_ADDRESS", "walletAddress is required");
  if (!walletPattern.test(wallet)) throw new HttpError(400, "INVALID_WALLET_ADDRESS", "walletAddress must be a 20-byte hex address");
  return wallet;
}

function optionalWallet(value: unknown): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : requireWallet(value);
}

function validateUSDC(value: string, field: string): void {
  try {
    parseUSDCMicros(value);
  } catch {
    throw new HttpError(400, "INVALID_USDC_AMOUNT", `${field} must be a non-negative decimal with at most 6 places`);
  }
}

function requireHttpUrl(value: unknown, field: string): string {
  const raw = String(value ?? "").trim();
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new HttpError(400, "INVALID_SOURCE_URL", `${field} must be an HTTP or HTTPS URL`);
  }
}

function requireHttpUrlOrDoi(value: unknown, field: string): string {
  const raw = String(value ?? "").trim();
  if (/^10\.\d{4,9}\/\S+$/i.test(raw)) return raw;
  return requireHttpUrl(raw, field);
}

function requireAdmin(request: IncomingMessage): void {
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const auth = verifyToken<{ typ: "auth"; exp: number; walletAddress: string }>(supplied, "auth");
  const adminWallets = new Set(
    (process.env.ADMIN_WALLETS ?? "").split(",").map((wallet) => wallet.trim().toLowerCase()).filter(Boolean)
  );
  if (auth && adminWallets.has(auth.walletAddress)) return;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) throw new HttpError(503, "ADMIN_NOT_CONFIGURED", "ADMIN_TOKEN or ADMIN_WALLETS is required for source review");
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    throw new HttpError(401, "UNAUTHORIZED", "Valid admin authorization is required");
  }
}

function requireWalletAuth(request: IncomingMessage, expectedWallet?: string): string {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const auth = verifyToken<{ typ: "auth"; exp: number; walletAddress: string }>(token, "auth");
  if (!auth) throw new HttpError(401, "WALLET_AUTH_REQUIRED", "Sign in with the wallet to continue");
  if (expectedWallet && auth.walletAddress !== expectedWallet.toLowerCase()) {
    throw new HttpError(403, "WALLET_MISMATCH", "Authenticated wallet does not own this resource");
  }
  return auth.walletAddress;
}

function publicSource(source: Source): PublicSource {
  const { evidenceText: _evidenceText, ownershipAttestation: _ownershipAttestation, walletAddress, ...metadata } = source;
  return { ...metadata, ownerWallet: walletAddress };
}

function adminSource(source: Source) {
  return {
    ...publicSource(source),
    evidencePreview: source.evidenceText.slice(0, 2_000),
    ownershipAttestation: source.ownershipAttestation
  };
}

function protectedEvidence(source: Source) {
  return {
    id: source.id,
    sourceId: source.id,
    title: source.title,
    authorName: source.authorName,
    evidenceText: source.evidenceText,
    citationPriceUSDC: source.citationPriceUSDC,
    citation: {
      sourceUrl: source.sourceUrl,
      doiOrCanonicalUrl: source.doiOrCanonicalUrl,
      license: source.license
    }
  };
}

function ipHash(request: IncomingMessage): string | undefined {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) return undefined;
  const forwarded = process.env.TRUST_PROXY === "true" ? request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() : undefined;
  const ip = forwarded ?? request.socket.remoteAddress;
  return ip ? createHmac("sha256", secret).update(ip).digest("hex") : undefined;
}

function setCorsHeaders(request: IncomingMessage, response: ServerResponse) {
  const requestOrigin = request.headers.origin;
  const configuredOrigin = process.env.CORS_ORIGIN;
  const isLocalDevOrigin = requestOrigin ? /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin) : false;
  const allowedOrigin = configuredOrigin ?? (isLocalDevOrigin && requestOrigin ? requestOrigin : "http://localhost:3000");

  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-payment-proof,PAYMENT-SIGNATURE");
}

function enforceRateLimit(request: IncomingMessage, response: ServerResponse, scope: "api" | "research") {
  const forwarded = process.env.TRUST_PROXY === "true" ? request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() : undefined;
  const identity = forwarded ?? request.socket.remoteAddress ?? "unknown";
  const windowMs = scope === "research" ? 60 * 60_000 : 60_000;
  const limit = Number(scope === "research" ? process.env.RESEARCH_RATE_LIMIT_PER_HOUR ?? 20 : process.env.API_RATE_LIMIT_PER_MINUTE ?? 180);
  const key = `${scope}:${identity}`;
  const now = Date.now();
  const current = rateLimits.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  rateLimits.set(key, bucket);
  response.setHeader("X-RateLimit-Limit", String(limit));
  response.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
  response.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count > limit) {
    metrics.rateLimited += 1;
    response.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    throw new HttpError(429, "RATE_LIMITED", "Too many requests; retry after the current rate-limit window");
  }
  if (rateLimits.size > 10_000) {
    for (const [entryKey, entry] of rateLimits) if (entry.resetAt <= now) rateLimits.delete(entryKey);
  }
}

function sendJson(response: ServerResponse, status: number, data: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(status === 204 ? undefined : JSON.stringify(data));
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 65_536) throw new HttpError(413, "REQUEST_TOO_LARGE", "JSON request body exceeds 64 KB");
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}
