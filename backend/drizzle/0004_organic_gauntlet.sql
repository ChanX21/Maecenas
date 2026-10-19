ALTER TABLE "research_runs" ADD COLUMN "ai_input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "ai_output_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "ai_cost_micros" integer DEFAULT 0 NOT NULL;