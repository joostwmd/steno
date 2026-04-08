import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Single-row table: id must be 1. Tracks NDJSON file path and byte cursor. */
export const syncState = sqliteTable("sync_state", {
  id: integer("id").primaryKey(),
  ndjsonPath: text("ndjson_path").notNull(),
  lastByteOffset: integer("last_byte_offset").notNull().default(0),
});

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    receivedAt: text("received_at").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    hookEventName: text("hook_event_name").notNull(),
    kind: text("kind").notNull(),
    conversationId: text("conversation_id"),
    generationId: text("generation_id"),
    model: text("model"),
    cursorVersion: text("cursor_version"),
    /** JSON stringified string[] */
    workspaceRoots: text("workspace_roots"),
    userEmail: text("user_email"),
    transcriptPath: text("transcript_path"),
    /** JSON stringified object */
    detail: text("detail").notNull(),
  },
  (t) => [
    index("events_received_at_idx").on(t.receivedAt),
    index("events_conversation_id_idx").on(t.conversationId),
    index("events_hook_event_name_idx").on(t.hookEventName),
    index("events_kind_idx").on(t.kind),
  ],
);

export const sessions = sqliteTable("sessions", {
  conversationId: text("conversation_id").primaryKey(),
  label: text("label"),
  lastEventAt: text("last_event_at").notNull(),
  eventCount: integer("event_count").notNull().default(0),
});

export const pinnedSession = sqliteTable("pinned_session", {
  conversationId: text("conversation_id").primaryKey(),
});

export const blockedSession = sqliteTable("blocked_session", {
  conversationId: text("conversation_id").primaryKey(),
});
