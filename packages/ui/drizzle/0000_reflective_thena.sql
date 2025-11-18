CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`github_owner` text NOT NULL,
	`github_repo` text NOT NULL,
	`display_name` text,
	`description` text,
	`homepage_url` text,
	`stars` integer DEFAULT 0,
	`is_public` integer DEFAULT true,
	`is_featured` integer DEFAULT false,
	`last_synced_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spec_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`spec_id` text NOT NULL,
	`related_spec_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`spec_id`) REFERENCES `specs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_spec_id`) REFERENCES `specs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `specs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`spec_number` integer,
	`spec_name` text NOT NULL,
	`title` text,
	`status` text,
	`priority` text,
	`tags` text,
	`assignee` text,
	`content_md` text NOT NULL,
	`content_html` text,
	`created_at` integer,
	`updated_at` integer,
	`completed_at` integer,
	`file_path` text NOT NULL,
	`github_url` text,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`specs_added` integer DEFAULT 0,
	`specs_updated` integer DEFAULT 0,
	`specs_deleted` integer DEFAULT 0,
	`error_message` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`duration_ms` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
