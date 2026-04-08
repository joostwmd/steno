CREATE TABLE `blocked_session` (
	`conversation_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`received_at` text NOT NULL,
	`schema_version` integer NOT NULL,
	`hook_event_name` text NOT NULL,
	`kind` text NOT NULL,
	`conversation_id` text,
	`generation_id` text,
	`model` text,
	`cursor_version` text,
	`workspace_roots` text,
	`user_email` text,
	`transcript_path` text,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_received_at_idx` ON `events` (`received_at`);--> statement-breakpoint
CREATE INDEX `events_conversation_id_idx` ON `events` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `events_hook_event_name_idx` ON `events` (`hook_event_name`);--> statement-breakpoint
CREATE INDEX `events_kind_idx` ON `events` (`kind`);--> statement-breakpoint
CREATE TABLE `pinned_session` (
	`conversation_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`conversation_id` text PRIMARY KEY NOT NULL,
	`label` text,
	`last_event_at` text NOT NULL,
	`event_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`ndjson_path` text NOT NULL,
	`last_byte_offset` integer DEFAULT 0 NOT NULL
);
