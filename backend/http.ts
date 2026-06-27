import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { createHmac } from "crypto";
import { URL } from "url";
import { runResearchAgent } from "@/agent/research-agent";
import {
  beginResearch,
  completeResearch,
  confirmSearchPayment,
  createSearchPaymentIntent,
  createSource,
  failResearch,
  findAnswer,
  findReceipt,
  findSource,
  getOrCreateUsage,
  listSources,
  readDb,
  StoreError
} from "@/db/store";
import { buildPaymentRequired, hasValidPaymentProof } from "@/payments/payment-executor";
import type { ResearchStrategy, Source } from "@/types";
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

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function createMecenasServer() {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const context: RouteContext = {
      request,
      response,
      url,
      method: request.method ?? "GET",
      path: url.pathname
    };

    setCorsHeaders(request, response);

    if (context.method === "OPTIONS") {
      return sendJson(response, 204, {});
    }

    try {
      await routeRequest(context);
    } catch (error) {
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
    return sendJson(response, 200, {
      ok: true,
      service: "mecenas-backend",
      tagline: "Scholarly agents that pay their sources."
    });
  }

  if (method === "GET" && path === "/api/sources") {
    return sendJson(response, 200, { sources: listSources() });
  }

  if (method === "GET" && path === "/api/usage") {
    const sessionId = requireSessionId(url.searchParams.get("sessionId"));
    const walletAddress = optionalWallet(url.searchParams.get("wallet"));
    const usage = getOrCreateUsage(sessionId, walletAddress, ipHash(request));
    return sendJson(response, 200, usageResponse(usage));
  }

  if (method === "POST" && path === "/api/sources") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const required = ["title", "authorName", "sourceUrl", "walletAddress", "citationPriceUSDC", "abstract", "evidenceText"];
    const missing = required.filter((field) => !body[field]);
    if (missing.length > 0) {
      return sendJson(response, 400, { error: `Missing required fields: ${missing.join(", ")}` });
    }

    const source: Source = {
      id: makeId("src"),
      title: String(body.title),
      authorName: String(body.authorName),
      sourceUrl: String(body.sourceUrl),
      doiOrCanonicalUrl: body.doiOrCanonicalUrl ? String(body.doiOrCanonicalUrl) : undefined,
      walletAddress: String(body.walletAddress),
      citationPriceUSDC: String(body.citationPriceUSDC),
      abstract: String(body.abstract),
      evidenceText: String(body.evidenceText),
      tags: String(body.tags ?? "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      license: body.license ? String(body.license) : undefined,
      createdAt: new Date().toISOString()
    };

    validateUSDC(source.citationPriceUSDC, "citationPriceUSDC");
    return sendJson(response, 201, { source: createSource(source) });
  }

  const sourcePreviewMatch = path.match(/^\/api\/sources\/([^/]+)\/preview$/);
  if (method === "GET" && sourcePreviewMatch) {
    const source = findSource(sourcePreviewMatch[1]);
    if (!source) return sendJson(response, 404, { error: "Source not found" });

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
    const source = findSource(sourceEvidenceMatch[1]);
    if (!source) return sendJson(response, 404, { error: "Source not found" });

    const proof = request.headers["x-payment-proof"]?.toString() ?? url.searchParams.get("proof");
    if (!hasValidPaymentProof(source, proof)) {
      return sendJson(response, 402, buildPaymentRequired(source));
    }

    return sendJson(response, 200, {
      id: source.id,
      title: source.title,
      authorName: source.authorName,
      evidenceText: source.evidenceText,
      citation: {
        sourceUrl: source.sourceUrl,
        doiOrCanonicalUrl: source.doiOrCanonicalUrl,
        license: source.license
      }
    });
  }

  const sourceMatch = path.match(/^\/api\/sources\/([^/]+)$/);
  if (method === "GET" && sourceMatch) {
    const source = findSource(sourceMatch[1]);
    if (!source) return sendJson(response, 404, { error: "Source not found" });
    return sendJson(response, 200, { source });
  }

  if (method === "POST" && path === "/api/payments/search-intent") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const sessionId = requireSessionId(body.sessionId);
    const walletAddress = requireWallet(body.walletAddress);
    const intent = createSearchPaymentIntent(sessionId, walletAddress);
    return sendJson(response, 201, {
      paymentIntentId: intent.id,
      amountUSDC: intent.amountUSDC,
      recipientWallet: process.env.MAECENAS_TREASURY_WALLET_ADDRESS ?? "",
      network: process.env.X402_NETWORK ?? "arc-testnet",
      status: intent.status,
      paymentMode: intent.paymentMode,
      expiresAt: intent.expiresAt
    });
  }

  if (method === "POST" && path === "/api/payments/search-proof") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const paymentIntentId = String(body.paymentIntentId ?? "").trim();
    if (!paymentIntentId) throw new HttpError(400, "INVALID_PAYMENT_INTENT", "paymentIntentId is required");
    const payment = confirmSearchPayment({
      paymentIntentId,
      sessionId: requireSessionId(body.sessionId),
      walletAddress: requireWallet(body.walletAddress),
      paymentProof: String(body.paymentProof ?? ""),
      txHash: body.txHash ? String(body.txHash) : undefined
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
      reservation = beginResearch({
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
      const answer = completeResearch(reservation.runId, result.answer, result.receipts);
      return sendResearchResponse(response, answer);
    } catch (error) {
      failResearch(reservation.runId);
      console.error(error);
      return sendJson(response, 500, { error: "RESEARCH_FAILED", message: "Research could not be completed" });
    }
  }

  const answerMatch = path.match(/^\/api\/answers\/([^/]+)$/);
  if (method === "GET" && answerMatch) {
    const answer = findAnswer(answerMatch[1]);
    if (!answer) return sendJson(response, 404, { error: "Answer not found" });
    return sendJson(response, 200, { answer });
  }

  const receiptMatch = path.match(/^\/api\/receipts\/([^/]+)$/);
  if (method === "GET" && receiptMatch) {
    const receipt = findReceipt(receiptMatch[1]);
    if (!receipt) return sendJson(response, 404, { error: "Receipt not found" });
    return sendJson(response, 200, { receipt });
  }

  if (method === "GET" && path === "/api/dashboard") {
    const wallet = url.searchParams.get("wallet")?.toLowerCase() ?? "";
    const db = readDb();
    const sources = db.sources.filter((source) => !wallet || source.walletAddress.toLowerCase() === wallet);
    const sourceIds = new Set(sources.map((source) => source.id));
    const receipts = db.receipts.filter((receipt) => sourceIds.has(receipt.sourceId));
    const topSource = sources
      .map((source) => ({
        source,
        earnedUSDC: sumUSDC(receipts.filter((receipt) => receipt.sourceId === source.id).map((receipt) => receipt.amountUSDC))
      }))
      .sort((a, b) => Number(b.earnedUSDC) - Number(a.earnedUSDC))[0];

    return sendJson(response, 200, {
      wallet,
      totalSourcesRegistered: sources.length,
      totalCitationsReceived: receipts.length,
      totalUSDCEarned: sumUSDC(receipts.map((receipt) => receipt.amountUSDC)),
      latestPaidCitations: receipts.slice(0, 10),
      topEarningSource: topSource ?? null
    });
  }

  if (method === "GET" && path === "/api/leaderboard") {
    const db = readDb();
    const owners = new Set(db.sources.map((source) => source.walletAddress.toLowerCase()));
    const topEarningSources = db.sources
      .map((source) => {
        const receipts = db.receipts.filter((receipt) => receipt.sourceId === source.id);
        return {
          sourceId: source.id,
          title: source.title,
          authorName: source.authorName,
          citations: receipts.length,
          earnedUSDC: sumUSDC(receipts.map((receipt) => receipt.amountUSDC))
        };
      })
      .sort((a, b) => Number(b.earnedUSDC) - Number(a.earnedUSDC))
      .slice(0, 8);

    return sendJson(response, 200, {
      metrics: {
        sourcesRegistered: db.sources.length,
        sourceOwners: owners.size,
        researchQuestionsAnswered: db.answers.length,
        paidEvidenceUnlocks: db.receipts.length,
        totalTestUSDCDistributed: sumUSDC(db.receipts.map((receipt) => receipt.amountUSDC)),
        questionsAnswered: db.answers.length,
        freeSearchesUsed: db.userUsages.reduce((total, usage) => total + usage.freeSearchesUsed, 0),
        paidSearchesCompleted: db.userUsages.reduce((total, usage) => total + usage.paidSearchesUsed, 0),
        paidSearchRevenueUSDC: sumUSDC(
          db.searchPayments.filter((payment) => payment.usedForAnswerId).map((payment) => payment.amountUSDC)
        ),
        sourcePayoutsUSDC: sumUSDC(db.receipts.map((receipt) => receipt.amountUSDC)),
        paidCitations: db.receipts.length
      },
      topEarningSources,
      recentPaymentStream: db.receipts.slice(0, 12)
    });
  }

  return sendJson(response, 404, { error: "Not found" });
}

function sendResearchResponse(response: ServerResponse, answer: ReturnType<typeof findAnswer> & {}) {
  const usage = getUsageByAnswer(answer);
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

function getUsageByAnswer(answer: NonNullable<ReturnType<typeof findAnswer>>) {
  return answer.sessionId ? getOrCreateUsage(answer.sessionId, answer.walletAddress) : undefined;
}

function sendPaymentRequired(response: ServerResponse, sessionId: string) {
  const usage = getOrCreateUsage(sessionId);
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

function usageResponse(usage: ReturnType<typeof getOrCreateUsage>) {
  const remaining = Math.max(0, usage.freeSearchLimit - usage.freeSearchesUsed);
  return {
    sessionId: usage.sessionId,
    walletAddress: usage.walletAddress,
    freeSearchesUsed: usage.freeSearchesUsed,
    freeSearchLimit: usage.freeSearchLimit,
    freeSearchesRemaining: remaining,
    paidSearchesUsed: usage.paidSearchesUsed,
    requiresPayment: remaining === 0,
    paidSearchPriceUSDC: process.env.PAID_SEARCH_PRICE_USDC ?? "0.01"
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
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,x-payment-proof");
}

function sendJson(response: ServerResponse, status: number, data: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
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
