CREATE TABLE "answers" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"content_json" text,
	"budget_micros" integer NOT NULL,
	"spent_micros" integer NOT NULL,
	"cited_source_ids_json" text NOT NULL,
	"decision_trace_json" text NOT NULL,
	"search_payment_id" text,
	"payment_type" text NOT NULL,
	"session_id" text,
	"wallet_address" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "citation_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"answer_id" text NOT NULL,
	"search_payment_id" text,
	"source_id" text NOT NULL,
	"source_title" text NOT NULL,
	"user_prompt" text NOT NULL,
	"amount_micros" integer NOT NULL,
	"tx_hash" text,
	"payment_id" text,
	"payer_agent" text NOT NULL,
	"payer_wallet" text NOT NULL,
	"recipient_wallet" text NOT NULL,
	"status" text NOT NULL,
	"funded_by" text NOT NULL,
	"receipt_signature" text DEFAULT '' NOT NULL,
	"network" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "citation_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "research_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"client_request_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text NOT NULL,
	"payment_type" text NOT NULL,
	"search_payment_id" text,
	"answer_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "search_payment_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"wallet_address" text,
	"amount_micros" integer NOT NULL,
	"status" text NOT NULL,
	"payment_mode" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_payment_intents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "search_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"intent_id" text NOT NULL,
	"session_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"amount_micros" integer NOT NULL,
	"status" text NOT NULL,
	"payment_mode" text NOT NULL,
	"payment_proof" text,
	"tx_hash" text,
	"payment_id" text,
	"created_at" text NOT NULL,
	"paid_at" text,
	"used_for_answer_id" text
);
--> statement-breakpoint
ALTER TABLE "search_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author_name" text NOT NULL,
	"source_url" text NOT NULL,
	"doi_or_canonical_url" text,
	"wallet_address" text NOT NULL,
	"citation_price_micros" integer NOT NULL,
	"abstract" text NOT NULL,
	"evidence_text" text NOT NULL,
	"tags_json" text NOT NULL,
	"license" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"ownership_verified_at" text,
	"ownership_attestation" text,
	"reviewed_at" text,
	"rejection_reason" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"wallet_address" text,
	"ip_hash" text,
	"free_searches_used" integer DEFAULT 0 NOT NULL,
	"free_search_limit" integer NOT NULL,
	"paid_searches_used" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_usages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wallet_auth_nonces" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"message" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_auth_nonces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_search_payment_id_search_payments_id_fk" FOREIGN KEY ("search_payment_id") REFERENCES "public"."search_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_payments" ADD CONSTRAINT "citation_payments_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_payments" ADD CONSTRAINT "citation_payments_search_payment_id_search_payments_id_fk" FOREIGN KEY ("search_payment_id") REFERENCES "public"."search_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citation_payments" ADD CONSTRAINT "citation_payments_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_search_payment_id_search_payments_id_fk" FOREIGN KEY ("search_payment_id") REFERENCES "public"."search_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_answer_id_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_payments" ADD CONSTRAINT "search_payments_intent_id_search_payment_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."search_payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "answers_search_payment_id_unique" ON "answers" USING btree ("search_payment_id");--> statement-breakpoint
CREATE INDEX "citation_payments_answer_idx" ON "citation_payments" USING btree ("answer_id");--> statement-breakpoint
CREATE INDEX "citation_payments_source_idx" ON "citation_payments" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "research_runs_request_unique" ON "research_runs" USING btree ("session_id","client_request_id");--> statement-breakpoint
CREATE INDEX "research_runs_payment_idx" ON "research_runs" USING btree ("search_payment_id");--> statement-breakpoint
CREATE INDEX "search_payment_intents_owner_idx" ON "search_payment_intents" USING btree ("session_id","wallet_address");--> statement-breakpoint
CREATE UNIQUE INDEX "search_payments_intent_id_unique" ON "search_payments" USING btree ("intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_payments_answer_id_unique" ON "search_payments" USING btree ("used_for_answer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_source_url_unique" ON "sources" USING btree ("source_url");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_canonical_url_unique" ON "sources" USING btree ("doi_or_canonical_url");--> statement-breakpoint
CREATE UNIQUE INDEX "user_usages_session_id_unique" ON "user_usages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "wallet_auth_nonces_wallet_idx" ON "wallet_auth_nonces" USING btree ("wallet_address");