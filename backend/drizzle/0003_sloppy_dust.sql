CREATE TABLE `wallet_auth_nonces` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`message` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wallet_auth_nonces_wallet_idx` ON `wallet_auth_nonces` (`wallet_address`);--> statement-breakpoint
ALTER TABLE `citation_payments` ADD `receipt_signature` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `citation_payments` ADD `network` text;--> statement-breakpoint
ALTER TABLE `sources` ADD `ownership_verified_at` text;
