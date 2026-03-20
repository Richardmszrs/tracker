CREATE TABLE `tt_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tt_entry_tags` (
	`entry_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `tt_time_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tt_tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tt_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`client_id` text,
	`hourly_rate` real,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `tt_clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tt_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tt_time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer,
	`project_id` text,
	`billable` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `tt_projects`(`id`) ON UPDATE no action ON DELETE no action
);
