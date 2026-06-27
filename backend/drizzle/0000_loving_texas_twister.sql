CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`budget_micros` integer NOT NULL,
	`spent_micros` integer NOT NULL,
	`cited_source_ids_json` text NOT NULL,
	`decision_trace_json` text NOT NULL,
	`search_payment_id` text,
	`payment_type` text NOT NULL,
	`session_id` text,
	`wallet_address` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`search_payment_id`) REFERENCES `search_payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answers_search_payment_id_unique` ON `answers` (`search_payment_id`);--> statement-breakpoint
CREATE TABLE `citation_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`search_payment_id` text,
	`source_id` text NOT NULL,
	`source_title` text NOT NULL,
	`user_prompt` text NOT NULL,
	`amount_micros` integer NOT NULL,
	`tx_hash` text,
	`payment_id` text,
	`payer_agent` text NOT NULL,
	`payer_wallet` text NOT NULL,
	`recipient_wallet` text NOT NULL,
	`status` text NOT NULL,
	`funded_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`answer_id`) REFERENCES `answers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`search_payment_id`) REFERENCES `search_payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `citation_payments_answer_idx` ON `citation_payments` (`answer_id`);--> statement-breakpoint
CREATE INDEX `citation_payments_source_idx` ON `citation_payments` (`source_id`);--> statement-breakpoint
CREATE TABLE `research_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`client_request_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`status` text NOT NULL,
	`payment_type` text NOT NULL,
	`search_payment_id` text,
	`answer_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`search_payment_id`) REFERENCES `search_payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`answer_id`) REFERENCES `answers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_runs_request_unique` ON `research_runs` (`session_id`,`client_request_id`);--> statement-breakpoint
CREATE INDEX `research_runs_payment_idx` ON `research_runs` (`search_payment_id`);--> statement-breakpoint
CREATE TABLE `search_payment_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`wallet_address` text,
	`amount_micros` integer NOT NULL,
	`status` text NOT NULL,
	`payment_mode` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `search_payment_intents_owner_idx` ON `search_payment_intents` (`session_id`,`wallet_address`);--> statement-breakpoint
CREATE TABLE `search_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`intent_id` text NOT NULL,
	`session_id` text NOT NULL,
	`wallet_address` text NOT NULL,
	`amount_micros` integer NOT NULL,
	`status` text NOT NULL,
	`payment_mode` text NOT NULL,
	`payment_proof` text,
	`tx_hash` text,
	`payment_id` text,
	`created_at` text NOT NULL,
	`paid_at` text,
	`used_for_answer_id` text,
	FOREIGN KEY (`intent_id`) REFERENCES `search_payment_intents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_payments_intent_id_unique` ON `search_payments` (`intent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `search_payments_answer_id_unique` ON `search_payments` (`used_for_answer_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author_name` text NOT NULL,
	`source_url` text NOT NULL,
	`doi_or_canonical_url` text,
	`wallet_address` text NOT NULL,
	`citation_price_micros` integer NOT NULL,
	`abstract` text NOT NULL,
	`evidence_text` text NOT NULL,
	`tags_json` text NOT NULL,
	`license` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_usages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`wallet_address` text,
	`ip_hash` text,
	`free_searches_used` integer DEFAULT 0 NOT NULL,
	`free_search_limit` integer NOT NULL,
	`paid_searches_used` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_usages_session_id_unique` ON `user_usages` (`session_id`);