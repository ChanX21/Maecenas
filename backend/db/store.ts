import { createHash } from "crypto";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { seedSources } from "@/db/seed-data";
import {
  answers,
  citationPayments,
  researchRuns,
  searchPaymentIntents,
  searchPayments,
  sources,
  userUsages
} from "@/db/schema";
import type {
  Answer,
  CitationPayment,
  MaecenasDatabase,
  SearchPayment,
  SearchPaymentIntent,
  Source,
  UserUsage
} from "@/types";
import { makeId } from "@/utils/ids";
import { microsToUSDC, parseUSDCMicros } from "@/utils/money";

type Db = BetterSQLite3Database<Record<string, never>>;

export class StoreError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

let sqlite: Database.Database | undefined;
let db: Db | undefined;

export function initializeDatabase(): void {
  if (db) return;
  const configuredPath = process.env.DATABASE_URL || "./data/maecenas.db";
  if (/^postgres(?:ql)?:/.test(configuredPath)) {
    throw new Error("DATABASE_URL is PostgreSQL, but this build uses SQLite");
  }
  const dbPath = path.resolve(process.cwd(), configuredPath.replace(/^file:/, ""));
  mkdirSync(path.dirname(dbPath), { recursive: true });
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  db = drizzle(sqlite);
  const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
  migrate(db, { migrationsFolder });
}

export function closeDatabase(): void {
  sqlite?.close();
  sqlite = undefined;
  db = undefined;
}

function database(): Db {
  initializeDatabase();
  return db!;
}

function freeSearchLimit(): number {
  const value = Number(process.env.FREE_SEARCH_LIMIT ?? 5);
  if (!Number.isInteger(value) || value < 0) throw new Error("FREE_SEARCH_LIMIT must be a non-negative integer");
  return value;
}

function paymentMode(): "mock" | "real" {
  return process.env.PAYMENT_MODE === "real" ? "real" : "mock";
}

function paymentPriceMicros(): number {
  return parseUSDCMicros(process.env.PAID_SEARCH_PRICE_USDC ?? "0.01");
}

function mapSource(row: typeof sources.$inferSelect): Source {
  return {
    id: row.id,
    title: row.title,
    authorName: row.authorName,
    sourceUrl: row.sourceUrl,
    doiOrCanonicalUrl: row.doiOrCanonicalUrl ?? undefined,
    walletAddress: row.walletAddress,
    citationPriceUSDC: microsToUSDC(row.citationPriceMicros),
    abstract: row.abstract,
    evidenceText: row.evidenceText,
    tags: JSON.parse(row.tagsJson) as string[],
    license: row.license ?? undefined,
    createdAt: row.createdAt
  };
}

function mapAnswer(row: typeof answers.$inferSelect): Answer {
  return {
    id: row.id,
    prompt: row.prompt,
    response: row.response,
    contentJson: row.contentJson ? JSON.parse(row.contentJson) : undefined,
    budgetUSDC: microsToUSDC(row.budgetMicros),
    spentUSDC: microsToUSDC(row.spentMicros),
    citedSourceIds: JSON.parse(row.citedSourceIdsJson) as string[],
    decisionTraceJson: JSON.parse(row.decisionTraceJson),
    searchPaymentId: row.searchPaymentId ?? undefined,
    paymentType: row.paymentType,
    sessionId: row.sessionId ?? undefined,
    walletAddress: row.walletAddress ?? undefined,
    createdAt: row.createdAt
  };
}

function mapReceipt(row: typeof citationPayments.$inferSelect): CitationPayment {
  return {
    id: row.id,
    answerId: row.answerId,
    searchPaymentId: row.searchPaymentId ?? undefined,
    sourceId: row.sourceId,
    sourceTitle: row.sourceTitle,
    userPrompt: row.userPrompt,
    amountUSDC: microsToUSDC(row.amountMicros),
    txHash: row.txHash ?? undefined,
    paymentId: row.paymentId ?? undefined,
    payerAgent: row.payerAgent,
    payerWallet: row.payerWallet,
    recipientWallet: row.recipientWallet,
    status: row.status,
    fundedBy: row.fundedBy,
    createdAt: row.createdAt
  };
}

function mapUsage(row: typeof userUsages.$inferSelect): UserUsage {
  return {
    ...row,
    walletAddress: row.walletAddress ?? undefined,
    ipHash: row.ipHash ?? undefined
  };
}

function mapIntent(row: typeof searchPaymentIntents.$inferSelect): SearchPaymentIntent {
  return {
    id: row.id,
    sessionId: row.sessionId,
    walletAddress: row.walletAddress ?? undefined,
    amountUSDC: microsToUSDC(row.amountMicros),
    status: row.status,
    paymentMode: row.paymentMode,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt
  };
}

function mapSearchPayment(row: typeof searchPayments.$inferSelect): SearchPayment {
  return {
    id: row.id,
    paymentIntentId: row.intentId,
    sessionId: row.sessionId,
    walletAddress: row.walletAddress,
    amountUSDC: microsToUSDC(row.amountMicros),
    status: row.status,
    paymentMode: row.paymentMode,
    paymentProof: row.paymentProof ?? undefined,
    txHash: row.txHash ?? undefined,
    paymentId: row.paymentId ?? undefined,
    createdAt: row.createdAt,
    paidAt: row.paidAt ?? undefined,
    usedForAnswerId: row.usedForAnswerId ?? undefined
  };
}

export function seedDatabase(): number {
  const conn = database();
  for (const source of seedSources) {
    const values = {
      id: source.id,
      title: source.title,
      authorName: source.authorName,
      sourceUrl: source.sourceUrl,
      doiOrCanonicalUrl: source.doiOrCanonicalUrl,
      walletAddress: source.walletAddress,
      citationPriceMicros: parseUSDCMicros(source.citationPriceUSDC),
      abstract: source.abstract,
      evidenceText: source.evidenceText,
      tagsJson: JSON.stringify(source.tags),
      license: source.license,
      createdAt: source.createdAt
    };
    conn.insert(sources).values(values).onConflictDoUpdate({ target: sources.id, set: values }).run();
  }
  return seedSources.length;
}

export function listSources(): Source[] {
  return database().select().from(sources).orderBy(desc(sources.createdAt)).all().map(mapSource);
}

export function findSource(id: string): Source | undefined {
  const row = database().select().from(sources).where(eq(sources.id, id)).get();
  return row ? mapSource(row) : undefined;
}

export function createSource(source: Source): Source {
  database()
    .insert(sources)
    .values({
      id: source.id,
      title: source.title,
      authorName: source.authorName,
      sourceUrl: source.sourceUrl,
      doiOrCanonicalUrl: source.doiOrCanonicalUrl,
      walletAddress: source.walletAddress,
      citationPriceMicros: parseUSDCMicros(source.citationPriceUSDC),
      abstract: source.abstract,
      evidenceText: source.evidenceText,
      tagsJson: JSON.stringify(source.tags),
      license: source.license,
      createdAt: source.createdAt
    })
    .run();
  return source;
}

export function findAnswer(id: string): Answer | undefined {
  const row = database().select().from(answers).where(eq(answers.id, id)).get();
  return row ? mapAnswer(row) : undefined;
}

export function findReceipt(id: string): CitationPayment | undefined {
  const row = database().select().from(citationPayments).where(eq(citationPayments.id, id)).get();
  return row ? mapReceipt(row) : undefined;
}

export function readDb(): MaecenasDatabase {
  const conn = database();
  return {
    sources: conn.select().from(sources).orderBy(desc(sources.createdAt)).all().map(mapSource),
    answers: conn.select().from(answers).orderBy(desc(answers.createdAt)).all().map(mapAnswer),
    receipts: conn.select().from(citationPayments).orderBy(desc(citationPayments.createdAt)).all().map(mapReceipt),
    userUsages: conn.select().from(userUsages).all().map(mapUsage),
    searchPaymentIntents: conn.select().from(searchPaymentIntents).all().map(mapIntent),
    searchPayments: conn.select().from(searchPayments).all().map(mapSearchPayment)
  };
}

function getOrCreateUsageInTransaction(
  tx: Db,
  sessionId: string,
  walletAddress?: string,
  ipHash?: string
): typeof userUsages.$inferSelect {
  const existing = tx.select().from(userUsages).where(eq(userUsages.sessionId, sessionId)).get();
  const now = new Date().toISOString();
  if (existing) {
    if ((walletAddress && !existing.walletAddress) || (ipHash && !existing.ipHash)) {
      tx.update(userUsages)
        .set({
          walletAddress: existing.walletAddress ?? walletAddress,
          ipHash: existing.ipHash ?? ipHash,
          updatedAt: now
        })
        .where(eq(userUsages.id, existing.id))
        .run();
      return tx.select().from(userUsages).where(eq(userUsages.id, existing.id)).get()!;
    }
    return existing;
  }
  const usage = {
    id: makeId("usage"),
    sessionId,
    walletAddress,
    ipHash,
    freeSearchesUsed: 0,
    freeSearchLimit: freeSearchLimit(),
    paidSearchesUsed: 0,
    createdAt: now,
    updatedAt: now
  };
  tx.insert(userUsages).values(usage).run();
  return tx.select().from(userUsages).where(eq(userUsages.id, usage.id)).get()!;
}

export function getOrCreateUsage(sessionId: string, walletAddress?: string, ipHash?: string): UserUsage {
  return database().transaction((tx) => mapUsage(getOrCreateUsageInTransaction(tx as Db, sessionId, walletAddress, ipHash)));
}

export function getUsageBySession(sessionId: string): UserUsage | undefined {
  const row = database().select().from(userUsages).where(eq(userUsages.sessionId, sessionId)).get();
  return row ? mapUsage(row) : undefined;
}

export type BeginResearchInput = {
  sessionId: string;
  walletAddress?: string;
  searchPaymentId?: string;
  clientRequestId: string;
  question: string;
  strategy: string;
  requestedBudgetUSDC?: string;
  ipHash?: string;
};

export type BeginResearchResult =
  | { kind: "existing"; answer: Answer }
  | {
      kind: "started";
      runId: string;
      paymentType: "free_sponsored" | "user_paid";
      searchPaymentId?: string;
      budgetUSDC: string;
    };

export function beginResearch(input: BeginResearchInput): BeginResearchResult {
  const conn = database();
  const requestHash = createHash("sha256")
    .update(JSON.stringify([input.question, input.strategy, input.requestedBudgetUSDC ?? null, input.walletAddress ?? null, input.searchPaymentId ?? null]))
    .digest("hex");

  return conn.transaction((rawTx) => {
    const tx = rawTx as Db;
    const existing = tx
      .select()
      .from(researchRuns)
      .where(and(eq(researchRuns.sessionId, input.sessionId), eq(researchRuns.clientRequestId, input.clientRequestId)))
      .get();
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new StoreError("IDEMPOTENCY_KEY_CONFLICT", "clientRequestId was already used for a different request", 409);
      }
      if (existing.status === "completed" && existing.answerId) {
        const answer = tx.select().from(answers).where(eq(answers.id, existing.answerId)).get();
        if (answer) return { kind: "existing", answer: mapAnswer(answer) };
      }
      const timeoutMs = Number(process.env.RESEARCH_RUN_TIMEOUT_MINUTES ?? 15) * 60_000;
      if (existing.status === "processing" && Date.now() - Date.parse(existing.updatedAt) < timeoutMs) {
        throw new StoreError("RESEARCH_IN_PROGRESS", "This research request is already processing", 409);
      }
      tx.delete(researchRuns).where(eq(researchRuns.id, existing.id)).run();
    }

    const usage = getOrCreateUsageInTransaction(tx, input.sessionId, input.walletAddress, input.ipHash);
    const processingFreeRuns = tx
      .select({ id: researchRuns.id })
      .from(researchRuns)
      .where(
        and(
          eq(researchRuns.sessionId, input.sessionId),
          eq(researchRuns.status, "processing"),
          eq(researchRuns.paymentType, "free_sponsored")
        )
      )
      .all().length;

    let paymentType: "free_sponsored" | "user_paid";
    let budgetMicros: number;
    let searchPaymentId: string | undefined;

    if (usage.freeSearchesUsed + processingFreeRuns < usage.freeSearchLimit) {
      paymentType = "free_sponsored";
      const funded = parseUSDCMicros(process.env.FREE_SEARCH_BUDGET_USDC ?? "0.01");
      budgetMicros = input.requestedBudgetUSDC ? Math.min(parseUSDCMicros(input.requestedBudgetUSDC), funded) : funded;
    } else {
      if (usage.freeSearchesUsed < usage.freeSearchLimit) {
        throw new StoreError("FREE_QUOTA_BUSY", "The remaining free search is already processing", 409);
      }
      if (!input.walletAddress) throw new StoreError("MISSING_WALLET_ADDRESS", "Wallet address is required", 402);
      if (!input.searchPaymentId) throw new StoreError("PAYMENT_REQUIRED", "A confirmed search payment is required", 402);
      const payment = tx.select().from(searchPayments).where(eq(searchPayments.id, input.searchPaymentId)).get();
      if (!payment || !["paid", "mock"].includes(payment.status)) {
        throw new StoreError("PAYMENT_NOT_CONFIRMED", "Search payment is not confirmed", 402);
      }
      if (payment.sessionId !== input.sessionId) {
        throw new StoreError("SEARCH_PAYMENT_SESSION_MISMATCH", "Search payment belongs to another session", 409);
      }
      if (payment.walletAddress !== input.walletAddress) {
        throw new StoreError("SEARCH_PAYMENT_WALLET_MISMATCH", "Search payment belongs to another wallet", 409);
      }
      const activeUse = tx
        .select({ id: researchRuns.id })
        .from(researchRuns)
        .where(
          and(
            eq(researchRuns.searchPaymentId, payment.id),
            inArray(researchRuns.status, ["processing", "completed"])
          )
        )
        .get();
      if (payment.usedForAnswerId || activeUse) {
        throw new StoreError("SEARCH_PAYMENT_ALREADY_USED", "Search payment has already funded an answer", 409);
      }
      paymentType = "user_paid";
      searchPaymentId = payment.id;
      budgetMicros = input.requestedBudgetUSDC
        ? Math.min(parseUSDCMicros(input.requestedBudgetUSDC), payment.amountMicros)
        : payment.amountMicros;
    }

    const now = new Date().toISOString();
    const runId = makeId("run");
    tx.insert(researchRuns)
      .values({
        id: runId,
        sessionId: input.sessionId,
        clientRequestId: input.clientRequestId,
        requestHash,
        status: "processing",
        paymentType,
        searchPaymentId,
        createdAt: now,
        updatedAt: now
      })
      .run();
    return { kind: "started", runId, paymentType, searchPaymentId, budgetUSDC: microsToUSDC(budgetMicros) };
  });
}

export function completeResearch(runId: string, answer: Answer, receipts: CitationPayment[]): Answer {
  return database().transaction((rawTx) => {
    const tx = rawTx as Db;
    const run = tx.select().from(researchRuns).where(eq(researchRuns.id, runId)).get();
    if (!run || run.status !== "processing") throw new StoreError("RESEARCH_RUN_INVALID", "Research run is not active", 409);

    tx.insert(answers)
      .values({
        id: answer.id,
        prompt: answer.prompt,
        response: answer.response,
        contentJson: answer.contentJson ? JSON.stringify(answer.contentJson) : null,
        budgetMicros: parseUSDCMicros(answer.budgetUSDC),
        spentMicros: parseUSDCMicros(answer.spentUSDC),
        citedSourceIdsJson: JSON.stringify(answer.citedSourceIds),
        decisionTraceJson: JSON.stringify(answer.decisionTraceJson),
        searchPaymentId: answer.searchPaymentId,
        paymentType: answer.paymentType,
        sessionId: answer.sessionId,
        walletAddress: answer.walletAddress,
        createdAt: answer.createdAt
      })
      .run();

    if (receipts.length) {
      tx.insert(citationPayments)
        .values(
          receipts.map((receipt) => ({
            id: receipt.id,
            answerId: receipt.answerId,
            searchPaymentId: receipt.searchPaymentId,
            sourceId: receipt.sourceId,
            sourceTitle: receipt.sourceTitle,
            userPrompt: receipt.userPrompt,
            amountMicros: parseUSDCMicros(receipt.amountUSDC),
            txHash: receipt.txHash,
            paymentId: receipt.paymentId,
            payerAgent: receipt.payerAgent,
            payerWallet: receipt.payerWallet,
            recipientWallet: receipt.recipientWallet,
            status: receipt.status,
            fundedBy: receipt.fundedBy,
            createdAt: receipt.createdAt
          }))
        )
        .run();
    }

    const now = new Date().toISOString();
    const usage = tx.select().from(userUsages).where(eq(userUsages.sessionId, run.sessionId)).get()!;
    tx.update(userUsages)
      .set({
        freeSearchesUsed: usage.freeSearchesUsed + (run.paymentType === "free_sponsored" ? 1 : 0),
        paidSearchesUsed: usage.paidSearchesUsed + (run.paymentType === "user_paid" ? 1 : 0),
        updatedAt: now
      })
      .where(eq(userUsages.id, usage.id))
      .run();

    if (run.searchPaymentId) {
      const payment = tx.select().from(searchPayments).where(eq(searchPayments.id, run.searchPaymentId)).get()!;
      tx.update(searchPayments)
        .set({ usedForAnswerId: answer.id })
        .where(eq(searchPayments.id, payment.id))
        .run();
      tx.update(searchPaymentIntents)
        .set({ status: "used" })
        .where(eq(searchPaymentIntents.id, payment.intentId))
        .run();
    }
    tx.update(researchRuns)
      .set({ status: "completed", answerId: answer.id, updatedAt: now })
      .where(eq(researchRuns.id, run.id))
      .run();
    return answer;
  });
}

export function failResearch(runId: string): void {
  database()
    .update(researchRuns)
    .set({ status: "failed", searchPaymentId: null, updatedAt: new Date().toISOString() })
    .where(eq(researchRuns.id, runId))
    .run();
}

export function createSearchPaymentIntent(sessionId: string, walletAddress: string): SearchPaymentIntent {
  return database().transaction((rawTx) => {
    const tx = rawTx as Db;
    const usage = getOrCreateUsageInTransaction(tx, sessionId, walletAddress);
    if (usage.freeSearchesUsed < usage.freeSearchLimit) {
      throw new StoreError("FREE_QUOTA_AVAILABLE", "Free quota still available", 400);
    }
    const now = new Date();
    const reusable = tx
      .select()
      .from(searchPaymentIntents)
      .where(
        and(
          eq(searchPaymentIntents.sessionId, sessionId),
          eq(searchPaymentIntents.walletAddress, walletAddress),
          eq(searchPaymentIntents.status, "requires_payment")
        )
      )
      .all()
      .find((intent) => Date.parse(intent.expiresAt) > now.getTime());
    if (reusable) return mapIntent(reusable);

    const intent = {
      id: makeId("spi"),
      sessionId,
      walletAddress,
      amountMicros: paymentPriceMicros(),
      status: "requires_payment" as const,
      paymentMode: paymentMode(),
      expiresAt: new Date(now.getTime() + Number(process.env.SEARCH_PAYMENT_EXPIRY_MINUTES ?? 15) * 60_000).toISOString(),
      createdAt: now.toISOString()
    };
    tx.insert(searchPaymentIntents).values(intent).run();
    return mapIntent(intent);
  });
}

export type ConfirmSearchPaymentInput = {
  paymentIntentId: string;
  sessionId: string;
  walletAddress: string;
  paymentProof: string;
  txHash?: string;
};

export function confirmSearchPayment(input: ConfirmSearchPaymentInput): SearchPayment {
  return database().transaction((rawTx) => {
    const tx = rawTx as Db;
    const intent = tx.select().from(searchPaymentIntents).where(eq(searchPaymentIntents.id, input.paymentIntentId)).get();
    if (!intent) throw new StoreError("INVALID_PAYMENT_INTENT", "Payment intent was not found", 404);
    if (intent.sessionId !== input.sessionId) {
      throw new StoreError("SEARCH_PAYMENT_SESSION_MISMATCH", "Payment intent belongs to another session", 409);
    }
    if (intent.walletAddress !== input.walletAddress) {
      throw new StoreError("SEARCH_PAYMENT_WALLET_MISMATCH", "Payment intent belongs to another wallet", 409);
    }
    const existing = tx.select().from(searchPayments).where(eq(searchPayments.intentId, intent.id)).get();
    if (existing) return mapSearchPayment(existing);
    if (Date.parse(intent.expiresAt) <= Date.now()) {
      throw new StoreError("PAYMENT_INTENT_EXPIRED", "Payment intent has expired", 410);
    }
    if (intent.status !== "requires_payment") {
      throw new StoreError("INVALID_PAYMENT_INTENT", "Payment intent cannot be paid", 409);
    }
    if (!input.paymentProof.trim()) {
      throw new StoreError("PAYMENT_NOT_CONFIRMED", "Payment proof is required", 400);
    }
    if (intent.paymentMode !== "mock") {
      throw new StoreError("PAYMENT_NOT_CONFIRMED", "Real payment verification is not configured", 501);
    }
    const now = new Date().toISOString();
    const payment = {
      id: makeId("sp"),
      intentId: intent.id,
      sessionId: input.sessionId,
      walletAddress: input.walletAddress,
      amountMicros: intent.amountMicros,
      status: "mock" as const,
      paymentMode: "mock" as const,
      paymentProof: input.paymentProof,
      txHash: input.txHash ?? null,
      paymentId: `mock_${makeId("pay").slice(4)}`,
      createdAt: now,
      paidAt: now,
      usedForAnswerId: null
    };
    tx.insert(searchPayments).values(payment).run();
    tx.update(searchPaymentIntents).set({ status: "paid" }).where(eq(searchPaymentIntents.id, intent.id)).run();
    return mapSearchPayment(payment);
  });
}

export function getSearchPayment(id: string): SearchPayment | undefined {
  const row = database().select().from(searchPayments).where(eq(searchPayments.id, id)).get();
  return row ? mapSearchPayment(row) : undefined;
}
