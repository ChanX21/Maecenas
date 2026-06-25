import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { URL } from "url";
import { runResearchAgent } from "@/agent/research-agent";
import { createSource, findAnswer, findReceipt, findSource, listSources, readDb, resetDbWithSeeds } from "@/db/store";
import { buildPaymentRequired, hasValidPaymentProof } from "@/payments/payment-executor";
import type { ResearchStrategy, Source } from "@/types";
import { makeId } from "@/utils/ids";
import { sumUSDC } from "@/utils/money";

type RouteContext = {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  method: string;
  path: string;
};

const strategies = new Set(["conservative", "balanced", "aggressive"]);

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
      console.error(error);
      sendJson(response, 500, { error: "Internal server error" });
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
    return sendJson(response, 200, { sources: await listSources() });
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

    return sendJson(response, 201, { source: await createSource(source) });
  }

  const sourcePreviewMatch = path.match(/^\/api\/sources\/([^/]+)\/preview$/);
  if (method === "GET" && sourcePreviewMatch) {
    const source = await findSource(sourcePreviewMatch[1]);
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
    const source = await findSource(sourceEvidenceMatch[1]);
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
    const source = await findSource(sourceMatch[1]);
    if (!source) return sendJson(response, 404, { error: "Source not found" });
    return sendJson(response, 200, { source });
  }

  if (method === "POST" && path === "/api/research") {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const question = String(body.question ?? "").trim();
    const budgetUSDC = String(body.budgetUSDC ?? "0.01");
    const strategy = String(body.strategy ?? "balanced") as ResearchStrategy;

    if (!question) return sendJson(response, 400, { error: "Question is required" });
    if (!strategies.has(strategy)) {
      return sendJson(response, 400, { error: "Strategy must be conservative, balanced, or aggressive" });
    }

    const answer = await runResearchAgent({ question, budgetUSDC, strategy });
    return sendJson(response, 200, {
      answerId: answer.id,
      status: "completed",
      budget: {
        max: answer.budgetUSDC,
        spent: answer.spentUSDC
      },
      selectedSources: answer.decisionTraceJson.budgetDecision.selectedSources,
      skippedSources: answer.decisionTraceJson.budgetDecision.skippedSources,
      receipts: answer.decisionTraceJson.receipts
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

  if (method === "GET" && path === "/api/dashboard") {
    const wallet = url.searchParams.get("wallet")?.toLowerCase() ?? "";
    const db = await readDb();
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
    const db = await readDb();
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
        totalTestUSDCDistributed: sumUSDC(db.receipts.map((receipt) => receipt.amountUSDC))
      },
      topEarningSources,
      recentPaymentStream: db.receipts.slice(0, 12)
    });
  }

  if (method === "POST" && path === "/api/admin/seed") {
    const db = await resetDbWithSeeds();
    return sendJson(response, 200, { ok: true, sources: db.sources.length });
  }

  return sendJson(response, 404, { error: "Not found" });
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
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}
