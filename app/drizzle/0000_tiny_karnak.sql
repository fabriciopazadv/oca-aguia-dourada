CREATE TABLE `store_meta` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `store_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_store_records_kind` ON `store_records` (`kind`);