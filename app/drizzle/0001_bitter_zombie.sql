CREATE TABLE `access_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_access_attempts_reset` ON `access_attempts` (`reset_at`);--> statement-breakpoint
CREATE TABLE `access_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`expires_at` integer NOT NULL,
	`code_tag` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_access_sessions_expiry` ON `access_sessions` (`expires_at`);