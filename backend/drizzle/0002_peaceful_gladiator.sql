ALTER TABLE `sources` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `sources` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `sources` ADD `rejection_reason` text;--> statement-breakpoint
CREATE UNIQUE INDEX `sources_source_url_unique` ON `sources` (`source_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `sources_canonical_url_unique` ON `sources` (`doi_or_canonical_url`);