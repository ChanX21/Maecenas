CREATE TABLE "evidence_payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_scope" text NOT NULL,
	"source_id" text NOT NULL,
	"amount_micros" integer NOT NULL,
	"recipient_wallet" text NOT NULL,
	"status" text NOT NULL,
	"payment_proof" text,
	"payment_id" text,
	"tx_hash" text,
	"payer_wallet" text,
	"network" text,
	"evidence_json" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_payment_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidence_payment_attempts" ADD CONSTRAINT "evidence_payment_attempts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_payment_attempts_scope_source_unique" ON "evidence_payment_attempts" USING btree ("payment_scope","source_id");--> statement-breakpoint
CREATE INDEX "evidence_payment_attempts_scope_idx" ON "evidence_payment_attempts" USING btree ("payment_scope");