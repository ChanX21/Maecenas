import { createHash } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";
import { seedSources } from "@/db/seed-data";
import {
  answers,
  citationPayments,
  researchRuns,
  searchPaymentIntents,
  searchPayments,
  sources,
  userUsages,
  walletAuthNonces
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
import { signReceipt, walletAuthMessage } from "@/security";
import { makeId } from "@/utils/ids";
import { microsToUSDC, parseUSDCMicros } from "@/utils/money";

type Db = PostgresJsDatabase<Record<string, never>>;

export class StoreError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

let client: Sql | undefined;
let db: Db | undefined;
let initializing: Promise<void> | undefined;

export async function initializeDatabase(): Promise<void> {
  if (db) return;
  if (initializing) return initializing;
  initializing = (async () => {
    const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!url || !/^postgres(?:ql)?:/.test(url)) {
      throw new Error("SUPABASE_DATABASE_URL must be a Supabase PostgreSQL connection string");
    }
    client = postgres(url, {
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      prepare: false,
      ssl: "require"
    });
    db = drizzle(client);
    const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
    await migrate(db, { migrationsFolder });
    const unsignedReceipts = await db.select().from(citationPayments).where(eq(citationPayments.receiptSignature, ""));
    for (const row of unsignedReceipts) {
      await db.update(citationPayments)
        .set({ receiptSignature: signReceipt(mapReceipt(row)) })
        .where(eq(citationPayments.id, row.id));
    }
  })();
  try {
    await initializing;
  } catch (error) {
    await client?.end();
    client = undefined;
    db = undefined;
    initializing = undefined;
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await client?.end();
  client = undefined;
  db = undefined;
  initializing = undefined;
}

export async function resetDatabaseForTests(): Promise<void> {
  if (process.env.NODE_ENV !== "test") throw new Error("Test reset is disabled outside NODE_ENV=test");
  const conn = await database();
  await conn.transaction(async (tx) => {
    await tx.delete(citationPayments);
    await tx.delete(researchRuns);
    await tx.delete(answers);
    await tx.delete(searchPayments);
    await tx.delete(searchPaymentIntents);
    await tx.delete(userUsages);
    await tx.delete(walletAuthNonces);
    await tx.delete(sources);
  });
}

async function database(): Promise<Db> {
  await initializeDatabase();
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

function platformFeeBps(): number {
  const value = Number(process.env.PLATFORM_FEE_BPS ?? 1000);
  if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new Error("PLATFORM_FEE_BPS must be between 0 and 10000");
  return value;
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
    status: row.status,
    ownershipVerifiedAt: row.ownershipVerifiedAt ?? undefined,
    ownershipAttestation: row.ownershipAttestation ?? undefined,
    reviewedAt: row.reviewedAt ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
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
    receiptSignature: row.receiptSignature,
    network: row.network ?? undefined,
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

export async function seedDatabase(): Promise<number> {
  const conn = await database();
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
      status: source.status,
      ownershipVerifiedAt: source.ownershipVerifiedAt,
      ownershipAttestation: source.ownershipAttestation,
      reviewedAt: source.reviewedAt,
      rejectionReason: source.rejectionReason,
      createdAt: source.createdAt
    };
    await conn.insert(sources).values(values).onConflictDoUpdate({ target: sources.id, set: values });
  }
  return seedSources.length;
}

export async function listSources(options: { walletAddress?: string; includeUnapproved?: boolean } = {}): Promise<Source[]> {
  const conn = await database();
  const rows = options.walletAddress
    ? await conn.select().from(sources).orderBy(desc(sources.createdAt))
    : options.includeUnapproved
      ? await conn.select().from(sources).orderBy(desc(sources.createdAt))
      : await conn.select().from(sources).where(eq(sources.status, "approved")).orderBy(desc(sources.createdAt));
  return rows
    .filter((source) => !options.walletAddress || source.walletAddress.toLowerCase() === options.walletAddress)
    .map(mapSource);
}

export async function findSource(id: string): Promise<Source | undefined> {
  const row = (await (await database()).select().from(sources).where(eq(sources.id, id)).limit(1))[0];
  return row ? mapSource(row) : undefined;
}

export async function createSource(source: Source): Promise<Source> {
  const conn = await database();
  const duplicate = (await conn
    .select({ id: sources.id })
    .from(sources)
    .where(
      source.doiOrCanonicalUrl
        ? or(eq(sources.sourceUrl, source.sourceUrl), eq(sources.doiOrCanonicalUrl, source.doiOrCanonicalUrl))
        : eq(sources.sourceUrl, source.sourceUrl)
    )
    .limit(1))[0];
  if (duplicate) throw new StoreError("SOURCE_ALREADY_REGISTERED", "This source URL or canonical URL is already registered", 409);
  await conn
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
      status: source.status,
      ownershipVerifiedAt: source.ownershipVerifiedAt,
      ownershipAttestation: source.ownershipAttestation,
      reviewedAt: source.reviewedAt,
      rejectionReason: source.rejectionReason,
      createdAt: source.createdAt
    });
  return source;
}

export async function reviewSource(id: string, status: "approved" | "rejected", rejectionReason?: string): Promise<Source> {
  const conn = await database();
  const existing = (await conn.select().from(sources).where(eq(sources.id, id)).limit(1))[0];
  if (!existing) throw new StoreError("SOURCE_NOT_FOUND", "Source was not found", 404);
  await conn.update(sources)
    .set({
      status,
      ownershipVerifiedAt: status === "approved" ? existing.ownershipVerifiedAt ?? new Date().toISOString() : existing.ownershipVerifiedAt,
      reviewedAt: new Date().toISOString(),
      rejectionReason: status === "rejected" ? rejectionReason ?? "Source did not pass review" : null
    })
    .where(eq(sources.id, id));
  return mapSource((await conn.select().from(sources).where(eq(sources.id, id)).limit(1))[0]!);
}

export async function findAnswer(id: string): Promise<Answer | undefined> {
  const row = (await (await database()).select().from(answers).where(eq(answers.id, id)).limit(1))[0];
  return row ? mapAnswer(row) : undefined;
}

export async function findReceipt(id: string): Promise<CitationPayment | undefined> {
  const row = (await (await database()).select().from(citationPayments).where(eq(citationPayments.id, id)).limit(1))[0];
  return row ? mapReceipt(row) : undefined;
}

export async function createWalletAuthNonce(walletAddress: string): Promise<{ id: string; message: string; expiresAt: string }> {
  const id = makeId("nonce");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const message = walletAuthMessage(walletAddress, id, expiresAt);
  await (await database()).insert(walletAuthNonces).values({ id, walletAddress, message, expiresAt, createdAt });
  return { id, message, expiresAt };
}

export async function consumeWalletAuthNonce(id: string, walletAddress: string): Promise<string> {
  return (await database()).transaction(async (rawTx) => {
    const tx = rawTx as Db;
    const nonce = (await tx.select().from(walletAuthNonces).where(eq(walletAuthNonces.id, id)).for("update").limit(1))[0];
    if (!nonce || nonce.walletAddress !== walletAddress || nonce.usedAt || Date.parse(nonce.expiresAt) <= Date.now()) {
      throw new StoreError("INVALID_AUTH_NONCE", "Wallet authentication challenge is invalid or expired", 401);
    }
    await tx.update(walletAuthNonces).set({ usedAt: new Date().toISOString() }).where(eq(walletAuthNonces.id, id));
    return nonce.message;
  });
}

export async function readDb(): Promise<MaecenasDatabase> {
  const conn = await database();
  const [sourceRows, answerRows, receiptRows, usageRows, intentRows, paymentRows] = await Promise.all([
    conn.select().from(sources).orderBy(desc(sources.createdAt)),
    conn.select().from(answers).orderBy(desc(answers.createdAt)),
    conn.select().from(citationPayments).orderBy(desc(citationPayments.createdAt)),
    conn.select().from(userUsages),
    conn.select().from(searchPaymentIntents),
    conn.select().from(searchPayments)
  ]);
  return {
    sources: sourceRows.map(mapSource),
    answers: answerRows.map(mapAnswer),
    receipts: receiptRows.map(mapReceipt),
    userUsages: usageRows.map(mapUsage),
    searchPaymentIntents: intentRows.map(mapIntent),
    searchPayments: paymentRows.map(mapSearchPayment)
  };
}

async function getOrCreateUsageInTransaction(
  tx: Db,
  sessionId: string,
  walletAddress?: string,
  ipHash?: string
): Promise<typeof userUsages.$inferSelect> {
  const existing = (await tx.select().from(userUsages).where(eq(userUsages.sessionId, sessionId)).for("update").limit(1))[0];
  const now = new Date().toISOString();
  if (existing) {
    if ((walletAddress && !existing.walletAddress) || (ipHash && !existing.ipHash)) {
      await tx.update(userUsages)
        .set({
          walletAddress: existing.walletAddress ?? walletAddress,
          ipHash: existing.ipHash ?? ipHash,
          updatedAt: now
        })
        .where(eq(userUsages.id, existing.id));
      return (await tx.select().from(userUsages).where(eq(userUsages.id, existing.id)).limit(1))[0]!;
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
  await tx.insert(userUsages).values(usage).onConflictDoNothing({ target: userUsages.sessionId });
  return (await tx.select().from(userUsages).where(eq(userUsages.sessionId, sessionId)).for("update").limit(1))[0]!;
}

export async function getOrCreateUsage(sessionId: string, walletAddress?: string, ipHash?: string): Promise<UserUsage> {
  return (await database()).transaction(async (tx) => mapUsage(await getOrCreateUsageInTransaction(tx as Db, sessionId, walletAddress, ipHash)));
}

export async function getUsageBySession(sessionId: string): Promise<UserUsage | undefined> {
  const row = (await (await database()).select().from(userUsages).where(eq(userUsages.sessionId, sessionId)).limit(1))[0];
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

export async function beginResearch(input: BeginResearchInput): Promise<BeginResearchResult> {
  const conn = await database();
  const requestHash = createHash("sha256")
    .update(JSON.stringify([input.question, input.strategy, input.requestedBudgetUSDC ?? null, input.walletAddress ?? null, input.searchPaymentId ?? null]))
    .digest("hex");

  return conn.transaction(async (rawTx) => {
    const tx = rawTx as Db;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`research:${input.ipHash ?? input.sessionId}`}))`);
    const existing = (await tx
      .select()
      .from(researchRuns)
      .where(and(eq(researchRuns.sessionId, input.sessionId), eq(researchRuns.clientRequestId, input.clientRequestId)))
      .limit(1))[0];
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new StoreError("IDEMPOTENCY_KEY_CONFLICT", "clientRequestId was already used for a different request", 409);
      }
      if (existing.status === "completed" && existing.answerId) {
        const answer = (await tx.select().from(answers).where(eq(answers.id, existing.answerId)).limit(1))[0];
        if (answer) return { kind: "existing", answer: mapAnswer(answer) };
      }
      const timeoutMs = Number(process.env.RESEARCH_RUN_TIMEOUT_MINUTES ?? 15) * 60_000;
      if (existing.status === "processing" && Date.now() - Date.parse(existing.updatedAt) < timeoutMs) {
        throw new StoreError("RESEARCH_IN_PROGRESS", "This research request is already processing", 409);
      }
      await tx.delete(researchRuns).where(eq(researchRuns.id, existing.id));
    }

    const usage = await getOrCreateUsageInTransaction(tx, input.sessionId, input.walletAddress, input.ipHash);
    const scopedUsages = input.ipHash
      ? await tx.select().from(userUsages).where(eq(userUsages.ipHash, input.ipHash))
      : [usage];
    const scopedSessionIds = scopedUsages.map((entry) => entry.sessionId);
    const scopedFreeSearchesUsed = scopedUsages.reduce((total, entry) => total + entry.freeSearchesUsed, 0);
    const processingFreeRuns = (await tx
      .select({ id: researchRuns.id })
      .from(researchRuns)
      .where(
        and(
          inArray(researchRuns.sessionId, scopedSessionIds),
          eq(researchRuns.status, "processing"),
          eq(researchRuns.paymentType, "free_sponsored")
        )
      )).length;
    const sponsoredLimitMicros = parseUSDCMicros(process.env.SPONSORED_TREASURY_LIMIT_USDC ?? "1");
    const sponsoredSpentMicros = (await tx
      .select({ amountMicros: citationPayments.amountMicros })
      .from(citationPayments)
      .where(eq(citationPayments.fundedBy, "maecenas_sponsored")))
      .reduce((total, receipt) => total + receipt.amountMicros, 0);
    const sponsoredReservationMicros =
      processingFreeRuns * parseUSDCMicros(process.env.FREE_SEARCH_BUDGET_USDC ?? "0.01");
    const sponsoredRemainingMicros = Math.max(0, sponsoredLimitMicros - sponsoredSpentMicros - sponsoredReservationMicros);
    const freeQuotaAvailable = scopedFreeSearchesUsed + processingFreeRuns < usage.freeSearchLimit;

    let paymentType: "free_sponsored" | "user_paid";
    let budgetMicros: number;
    let searchPaymentId: string | undefined;

    if (freeQuotaAvailable && sponsoredRemainingMicros > 0) {
      paymentType = "free_sponsored";
      const funded = parseUSDCMicros(process.env.FREE_SEARCH_BUDGET_USDC ?? "0.01");
      budgetMicros = input.requestedBudgetUSDC
        ? Math.min(parseUSDCMicros(input.requestedBudgetUSDC), funded, sponsoredRemainingMicros)
        : Math.min(funded, sponsoredRemainingMicros);
    } else {
      if (!freeQuotaAvailable && scopedFreeSearchesUsed < usage.freeSearchLimit) {
        throw new StoreError("FREE_QUOTA_BUSY", "The remaining free search is already processing", 409);
      }
      if (!input.walletAddress) throw new StoreError("MISSING_WALLET_ADDRESS", "Wallet address is required", 402);
      if (!input.searchPaymentId) throw new StoreError("PAYMENT_REQUIRED", "A confirmed search payment is required", 402);
      const payment = (await tx.select().from(searchPayments).where(eq(searchPayments.id, input.searchPaymentId)).for("update").limit(1))[0];
      if (!payment || !["paid", "mock"].includes(payment.status)) {
        throw new StoreError("PAYMENT_NOT_CONFIRMED", "Search payment is not confirmed", 402);
      }
      if (payment.sessionId !== input.sessionId) {
        throw new StoreError("SEARCH_PAYMENT_SESSION_MISMATCH", "Search payment belongs to another session", 409);
      }
      if (payment.walletAddress !== input.walletAddress) {
        throw new StoreError("SEARCH_PAYMENT_WALLET_MISMATCH", "Search payment belongs to another wallet", 409);
      }
      const activeUse = (await tx
        .select({ id: researchRuns.id })
        .from(researchRuns)
        .where(
          and(
            eq(researchRuns.searchPaymentId, payment.id),
            inArray(researchRuns.status, ["processing", "completed"])
          )
        )
        .limit(1))[0];
      if (payment.usedForAnswerId || activeUse) {
        throw new StoreError("SEARCH_PAYMENT_ALREADY_USED", "Search payment has already funded an answer", 409);
      }
      paymentType = "user_paid";
      searchPaymentId = payment.id;
      const evidenceBudget = Math.floor((payment.amountMicros * (10_000 - platformFeeBps())) / 10_000);
      budgetMicros = input.requestedBudgetUSDC
        ? Math.min(parseUSDCMicros(input.requestedBudgetUSDC), evidenceBudget)
        : evidenceBudget;
    }

    const now = new Date().toISOString();
    const runId = makeId("run");
    await tx.insert(researchRuns)
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
      });
    return { kind: "started", runId, paymentType, searchPaymentId, budgetUSDC: microsToUSDC(budgetMicros) };
  });
}

export async function completeResearch(runId: string, answer: Answer, receipts: CitationPayment[]): Promise<Answer> {
  return (await database()).transaction(async (rawTx) => {
    const tx = rawTx as Db;
    const run = (await tx.select().from(researchRuns).where(eq(researchRuns.id, runId)).for("update").limit(1))[0];
    if (!run || run.status !== "processing") throw new StoreError("RESEARCH_RUN_INVALID", "Research run is not active", 409);

    await tx.insert(answers)
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
      });

    if (receipts.length) {
      await tx.insert(citationPayments)
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
            receiptSignature: receipt.receiptSignature,
            network: receipt.network,
            createdAt: receipt.createdAt
          }))
        );
    }

    const now = new Date().toISOString();
    const usage = (await tx.select().from(userUsages).where(eq(userUsages.sessionId, run.sessionId)).for("update").limit(1))[0]!;
    await tx.update(userUsages)
      .set({
        freeSearchesUsed: usage.freeSearchesUsed + (run.paymentType === "free_sponsored" ? 1 : 0),
        paidSearchesUsed: usage.paidSearchesUsed + (run.paymentType === "user_paid" ? 1 : 0),
        updatedAt: now
      })
      .where(eq(userUsages.id, usage.id));

    if (run.searchPaymentId) {
      const payment = (await tx.select().from(searchPayments).where(eq(searchPayments.id, run.searchPaymentId)).for("update").limit(1))[0]!;
      await tx.update(searchPayments)
        .set({ usedForAnswerId: answer.id })
        .where(eq(searchPayments.id, payment.id));
      await tx.update(searchPaymentIntents)
        .set({ status: "used" })
        .where(eq(searchPaymentIntents.id, payment.intentId));
    }
    await tx.update(researchRuns)
      .set({ status: "completed", answerId: answer.id, updatedAt: now })
      .where(eq(researchRuns.id, run.id));
    return answer;
  });
}

export async function failResearch(runId: string): Promise<void> {
  await (await database())
    .update(researchRuns)
    .set({ status: "failed", searchPaymentId: null, updatedAt: new Date().toISOString() })
    .where(eq(researchRuns.id, runId));
}

export async function getResearchRunStatus(runId: string, sessionId: string): Promise<{
  status: "processing" | "completed" | "failed";
  answer?: Answer;
} | undefined> {
  const run = (await (await database())
    .select()
    .from(researchRuns)
    .where(and(eq(researchRuns.id, runId), eq(researchRuns.sessionId, sessionId)))
    .limit(1))[0];
  if (!run) return undefined;
  const answer = run.answerId ? await findAnswer(run.answerId) : undefined;
  return { status: run.status, answer };
}

export async function createSearchPaymentIntent(sessionId: string, walletAddress: string): Promise<SearchPaymentIntent> {
  return (await database()).transaction(async (rawTx) => {
    const tx = rawTx as Db;
    const usage = await getOrCreateUsageInTransaction(tx, sessionId, walletAddress);
    if (usage.freeSearchesUsed < usage.freeSearchLimit) {
      throw new StoreError("FREE_QUOTA_AVAILABLE", "Free quota still available", 400);
    }
    const now = new Date();
    const reusable = (await tx
      .select()
      .from(searchPaymentIntents)
      .where(
        and(
          eq(searchPaymentIntents.sessionId, sessionId),
          eq(searchPaymentIntents.walletAddress, walletAddress),
          eq(searchPaymentIntents.status, "requires_payment")
        )
      ))
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
    await tx.insert(searchPaymentIntents).values(intent);
    return mapIntent(intent);
  });
}

export type ConfirmSearchPaymentInput = {
  paymentIntentId: string;
  sessionId: string;
  walletAddress: string;
  paymentProof: string;
  txHash?: string;
  settlement?: {
    payer: string;
    transaction: string;
    network: string;
  };
};

export async function confirmSearchPayment(input: ConfirmSearchPaymentInput): Promise<SearchPayment> {
  return (await database()).transaction(async (rawTx) => {
    const tx = rawTx as Db;
    const intent = (await tx.select().from(searchPaymentIntents).where(eq(searchPaymentIntents.id, input.paymentIntentId)).for("update").limit(1))[0];
    if (!intent) throw new StoreError("INVALID_PAYMENT_INTENT", "Payment intent was not found", 404);
    if (intent.sessionId !== input.sessionId) {
      throw new StoreError("SEARCH_PAYMENT_SESSION_MISMATCH", "Payment intent belongs to another session", 409);
    }
    if (intent.walletAddress !== input.walletAddress) {
      throw new StoreError("SEARCH_PAYMENT_WALLET_MISMATCH", "Payment intent belongs to another wallet", 409);
    }
    const existing = (await tx.select().from(searchPayments).where(eq(searchPayments.intentId, intent.id)).limit(1))[0];
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
    if (intent.paymentMode === "real") {
      if (!input.settlement || input.settlement.payer.toLowerCase() !== input.walletAddress) {
        throw new StoreError("PAYMENT_NOT_CONFIRMED", "Circle Gateway payer does not match the authenticated wallet", 402);
      }
    }
    const now = new Date().toISOString();
    const payment = {
      id: makeId("sp"),
      intentId: intent.id,
      sessionId: input.sessionId,
      walletAddress: input.walletAddress,
      amountMicros: intent.amountMicros,
      status: intent.paymentMode === "mock" ? "mock" as const : "paid" as const,
      paymentMode: intent.paymentMode,
      paymentProof: input.paymentProof,
      txHash: input.settlement?.transaction ?? input.txHash ?? null,
      paymentId: input.settlement?.transaction ?? `mock_${makeId("pay").slice(4)}`,
      createdAt: now,
      paidAt: now,
      usedForAnswerId: null
    };
    await tx.insert(searchPayments).values(payment);
    await tx.update(searchPaymentIntents).set({ status: "paid" }).where(eq(searchPaymentIntents.id, intent.id));
    return mapSearchPayment(payment);
  });
}

export async function getSearchPaymentIntent(id: string): Promise<SearchPaymentIntent | undefined> {
  const row = (await (await database()).select().from(searchPaymentIntents).where(eq(searchPaymentIntents.id, id)).limit(1))[0];
  return row ? mapIntent(row) : undefined;
}

export async function getSearchPayment(id: string): Promise<SearchPayment | undefined> {
  const row = (await (await database()).select().from(searchPayments).where(eq(searchPayments.id, id)).limit(1))[0];
  return row ? mapSearchPayment(row) : undefined;
}
