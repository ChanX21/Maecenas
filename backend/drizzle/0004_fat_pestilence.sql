PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_citation_payments` (
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
	`receipt_signature` text DEFAULT '' NOT NULL,
	`network` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`answer_id`) REFERENCES `answers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`search_payment_id`) REFERENCES `search_payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_citation_payments`("id", "answer_id", "search_payment_id", "source_id", "source_title", "user_prompt", "amount_micros", "tx_hash", "payment_id", "payer_agent", "payer_wallet", "recipient_wallet", "status", "funded_by", "receipt_signature", "network", "created_at") SELECT "id", "answer_id", "search_payment_id", "source_id", "source_title", "user_prompt", "amount_micros", "tx_hash", "payment_id", "payer_agent", "payer_wallet", "recipient_wallet", "status", "funded_by", "receipt_signature", "network", "created_at" FROM `citation_payments`;--> statement-breakpoint
DROP TABLE `citation_payments`;--> statement-breakpoint
ALTER TABLE `__new_citation_payments` RENAME TO `citation_payments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `citation_payments_answer_idx` ON `citation_payments` (`answer_id`);--> statement-breakpoint
CREATE INDEX `citation_payments_source_idx` ON `citation_payments` (`source_id`);--> statement-breakpoint
ALTER TABLE `sources` ADD `ownership_attestation` text;