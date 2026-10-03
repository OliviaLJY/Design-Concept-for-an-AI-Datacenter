CREATE TABLE `countries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`region` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `countries_name_unique` ON `countries` (`name`);--> statement-breakpoint
CREATE TABLE `design_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`design_id` integer NOT NULL,
	`claim_text` text NOT NULL,
	`claim_type` text NOT NULL,
	`source_id` integer,
	`status` text NOT NULL,
	FOREIGN KEY (`design_id`) REFERENCES `designs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_claims_design` ON `design_claims` (`design_id`);--> statement-breakpoint
CREATE TABLE `designs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`selected_country_id` integer,
	`it_load_mw` real NOT NULL,
	`pue` real NOT NULL,
	`cooling_strategy` text,
	`backup_strategy` text,
	`design_summary` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`selected_country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_id` integer NOT NULL,
	`metric_name` text NOT NULL,
	`value` real,
	`unit` text NOT NULL,
	`reporting_period` text,
	`source_id` integer NOT NULL,
	`retrieved_at` text NOT NULL,
	`confidence` text,
	`notes` text,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_metrics_country_metric` ON `metrics` (`country_id`,`metric_name`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_key` text NOT NULL,
	`publisher` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`source_type` text NOT NULL,
	`publication_date` text,
	`accessed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_source_key_unique` ON `sources` (`source_key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`authenticated_user_id` text NOT NULL,
	`email` text,
	`team_id` integer,
	`role` text DEFAULT 'viewer' NOT NULL,
	`registered_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_authenticated_id` ON `users` (`authenticated_user_id`);