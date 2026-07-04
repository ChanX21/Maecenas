import { index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  authorName: text("author_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  doiOrCanonicalUrl: text("doi_or_canonical_url"),
  walletAddress: text("wallet_address").notNull(),
  citationPriceMicros: integer("citation_price_micros").notNull(),
  abstract: text("abstract").notNull(),
  evidenceText: text("evidence_text").notNull(),
  tagsJson: text("tags_json").notNull(),
  license: text("license"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  ownershipVerifiedAt: text("ownership_verified_at"),
  ownershipAttestation: text("ownership_attestation"),
  reviewedAt: text("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: text("created_at").notNull()
}, (table) => [
  uniqueIndex("sources_source_url_unique").on(table.sourceUrl),
  uniqueIndex("sources_canonical_url_unique").on(table.doiOrCanonicalUrl)
]).enableRLS();

export const userUsages = pgTable(
  "user_usages",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    walletAddress: text("wallet_address"),
    ipHash: text("ip_hash"),
    freeSearchesUsed: integer("free_searches_used").notNull().default(0),
    freeSearchLimit: integer("free_search_limit").notNull(),
    paidSearchesUsed: integer("paid_searches_used").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [uniqueIndex("user_usages_session_id_unique").on(table.sessionId)]
).enableRLS();

export const searchPaymentIntents = pgTable(
  "search_payment_intents",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    walletAddress: text("wallet_address"),
    amountMicros: integer("amount_micros").notNull(),
    status: text("status", { enum: ["requires_payment", "paid", "expired", "used"] }).notNull(),
    paymentMode: text("payment_mode", { enum: ["mock", "real"] }).notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => [index("search_payment_intents_owner_idx").on(table.sessionId, table.walletAddress)]
).enableRLS();

export const searchPayments = pgTable(
  "search_payments",
  {
    id: text("id").primaryKey(),
    intentId: text("intent_id")
      .notNull()
      .references(() => searchPaymentIntents.id),
    sessionId: text("session_id").notNull(),
    walletAddress: text("wallet_address").notNull(),
    amountMicros: integer("amount_micros").notNull(),
    status: text("status", { enum: ["pending", "paid", "failed", "mock"] }).notNull(),
    paymentMode: text("payment_mode", { enum: ["mock", "real"] }).notNull(),
    paymentProof: text("payment_proof"),
    txHash: text("tx_hash"),
    paymentId: text("payment_id"),
    createdAt: text("created_at").notNull(),
    paidAt: text("paid_at"),
    usedForAnswerId: text("used_for_answer_id")
  },
  (table) => [
    uniqueIndex("search_payments_intent_id_unique").on(table.intentId),
    uniqueIndex("search_payments_answer_id_unique").on(table.usedForAnswerId)
  ]
).enableRLS();

export const answers = pgTable(
  "answers",
  {
    id: text("id").primaryKey(),
    prompt: text("prompt").notNull(),
    response: text("response").notNull(),
    contentJson: text("content_json"),
    budgetMicros: integer("budget_micros").notNull(),
    spentMicros: integer("spent_micros").notNull(),
    citedSourceIdsJson: text("cited_source_ids_json").notNull(),
    decisionTraceJson: text("decision_trace_json").notNull(),
    searchPaymentId: text("search_payment_id").references(() => searchPayments.id),
    paymentType: text("payment_type", { enum: ["free_sponsored", "user_paid"] }).notNull(),
    sessionId: text("session_id"),
    walletAddress: text("wallet_address"),
    createdAt: text("created_at").notNull()
  },
  (table) => [uniqueIndex("answers_search_payment_id_unique").on(table.searchPaymentId)]
).enableRLS();

export const citationPayments = pgTable(
  "citation_payments",
  {
    id: text("id").primaryKey(),
    answerId: text("answer_id")
      .notNull()
      .references(() => answers.id),
    searchPaymentId: text("search_payment_id").references(() => searchPayments.id),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    sourceTitle: text("source_title").notNull(),
    userPrompt: text("user_prompt").notNull(),
    amountMicros: integer("amount_micros").notNull(),
    txHash: text("tx_hash"),
    paymentId: text("payment_id"),
    payerAgent: text("payer_agent").notNull(),
    payerWallet: text("payer_wallet").notNull(),
    recipientWallet: text("recipient_wallet").notNull(),
    status: text("status", { enum: ["pending", "paid", "failed", "mock"] }).notNull(),
    fundedBy: text("funded_by", { enum: ["maecenas_sponsored", "user_paid_search"] }).notNull(),
    receiptSignature: text("receipt_signature").notNull().default(""),
    network: text("network"),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    index("citation_payments_answer_idx").on(table.answerId),
    index("citation_payments_source_idx").on(table.sourceId)
  ]
).enableRLS();

export const walletAuthNonces = pgTable(
  "wallet_auth_nonces",
  {
    id: text("id").primaryKey(),
    walletAddress: text("wallet_address").notNull(),
    message: text("message").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull()
  },
  (table) => [index("wallet_auth_nonces_wallet_idx").on(table.walletAddress)]
).enableRLS();

export const researchRuns = pgTable(
  "research_runs",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    clientRequestId: text("client_request_id").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status", { enum: ["processing", "completed", "failed"] }).notNull(),
    paymentType: text("payment_type", { enum: ["free_sponsored", "user_paid"] }).notNull(),
    searchPaymentId: text("search_payment_id").references(() => searchPayments.id),
    answerId: text("answer_id").references(() => answers.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    uniqueIndex("research_runs_request_unique").on(table.sessionId, table.clientRequestId),
    index("research_runs_payment_idx").on(table.searchPaymentId)
  ]
).enableRLS();
