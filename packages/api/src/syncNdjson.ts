import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { eq } from "drizzle-orm";
import { blockedSession, events, sessions, syncState } from "@steno/db";
import type { StenoDb } from "@steno/db";
import type { ApiContext } from "./context.js";

function extractSessionLabel(ev: Record<string, unknown>): string | undefined {
  if (ev.hook_event_name !== "beforeSubmitPrompt") return undefined;
  const d = ev.detail;
  if (!d || typeof d !== "object") return undefined;
  const rec = d as Record<string, unknown>;
  const p = rec.prompt ?? rec.prompt_preview;
  if (typeof p === "string" && p.trim()) {
    return p.length > 120 ? `${p.slice(0, 117)}...` : p;
  }
  return undefined;
}

function loadBlockedConversationIds(db: StenoDb): Set<string> {
  const rows = db.select().from(blockedSession).all();
  return new Set(rows.map((r) => r.conversationId));
}

/** Inserts one events row (and may upsert sessions). Returns false if skipped (blocked). */
function insertCanonicalEvent(
  db: StenoDb,
  ev: Record<string, unknown>,
  blockedIds: Set<string>,
): boolean {
  const schemaVersion =
    typeof ev.schema_version === "number" ? ev.schema_version : 0;
  const receivedAt =
    typeof ev.received_at === "string" ? ev.received_at : new Date().toISOString();
  const hookEventName =
    typeof ev.hook_event_name === "string" ? ev.hook_event_name : "unknown";
  const kind =
    typeof ev.kind === "string" ? ev.kind : hookEventName;
  const conversationId =
    typeof ev.conversation_id === "string" ? ev.conversation_id : null;

  if (conversationId && blockedIds.has(conversationId)) {
    return false;
  }
  const detailObj =
    ev.detail && typeof ev.detail === "object" && !Array.isArray(ev.detail)
      ? ev.detail
      : {};
  const detail = JSON.stringify(detailObj);
  const workspaceRoots = Array.isArray(ev.workspace_roots)
    ? JSON.stringify(
        ev.workspace_roots.filter((x): x is string => typeof x === "string"),
      )
    : null;

  db.insert(events).values({
    receivedAt,
    schemaVersion,
    hookEventName,
    kind,
    conversationId,
    generationId:
      typeof ev.generation_id === "string" ? ev.generation_id : null,
    model: typeof ev.model === "string" ? ev.model : null,
    cursorVersion:
      typeof ev.cursor_version === "string" ? ev.cursor_version : null,
    workspaceRoots,
    userEmail:
      ev.user_email === null || typeof ev.user_email === "string"
        ? (ev.user_email as string | null)
        : null,
    transcriptPath:
      ev.transcript_path === null || typeof ev.transcript_path === "string"
        ? (ev.transcript_path as string | null)
        : null,
    detail,
  }).run();

  if (!conversationId) return true;

  const label = extractSessionLabel(ev);
  const existing = db
    .select()
    .from(sessions)
    .where(eq(sessions.conversationId, conversationId))
    .get();

  if (existing) {
    const nextLabel =
      label && (!existing.label || existing.label.trim() === "")
        ? label
        : existing.label;
    db.update(sessions)
      .set({
        lastEventAt: receivedAt,
        eventCount: existing.eventCount + 1,
        label: nextLabel,
      })
      .where(eq(sessions.conversationId, conversationId))
      .run();
  } else {
    db.insert(sessions)
      .values({
        conversationId,
        label: label ?? null,
        lastEventAt: receivedAt,
        eventCount: 1,
      })
      .run();
  }
  return true;
}

/**
 * Incrementally read NDJSON from last byte offset; only complete lines are applied.
 */
export function syncNdjsonToSqlite(ctx: ApiContext): {
  inserted: number;
  newOffset: number;
} {
  const { db, ndjsonPath } = ctx;

  if (!existsSync(ndjsonPath)) {
    const existing = db
      .select()
      .from(syncState)
      .where(eq(syncState.id, 1))
      .get();
    if (!existing) {
      db.insert(syncState)
        .values({ id: 1, ndjsonPath, lastByteOffset: 0 })
        .run();
    } else {
      db.update(syncState)
        .set({ ndjsonPath })
        .where(eq(syncState.id, 1))
        .run();
    }
    return { inserted: 0, newOffset: 0 };
  }

  let row = db
    .select()
    .from(syncState)
    .where(eq(syncState.id, 1))
    .get();

  if (!row) {
    db.insert(syncState)
      .values({ id: 1, ndjsonPath, lastByteOffset: 0 })
      .run();
    row = { id: 1, ndjsonPath, lastByteOffset: 0 };
  } else if (row.ndjsonPath !== ndjsonPath) {
    db.update(syncState)
      .set({ ndjsonPath, lastByteOffset: 0 })
      .where(eq(syncState.id, 1))
      .run();
    row = { id: 1, ndjsonPath, lastByteOffset: 0 };
  }

  const st = statSync(ndjsonPath);
  let offset = row.lastByteOffset;

  if (st.size < offset) {
    db.delete(events).run();
    db.delete(sessions).run();
    offset = 0;
    db.update(syncState)
      .set({ lastByteOffset: 0 })
      .where(eq(syncState.id, 1))
      .run();
  }

  if (st.size === offset) {
    return { inserted: 0, newOffset: offset };
  }

  const toRead = st.size - offset;
  const buf = Buffer.alloc(toRead);
  const fd = openSync(ndjsonPath, "r");
  readSync(fd, buf, 0, toRead, offset);
  closeSync(fd);

  const blockedIds = loadBlockedConversationIds(db);

  // Track consumed bytes in the file, not string indices. After
  // `buf.toString("utf8")`, positions in the JS string are UTF-16 code units
  // and do not match UTF-8 byte lengths, so mixing them with `offset` skips or
  // replays lines once NDJSON contains non-ASCII (prompts, paths, etc.).
  let lineStart = 0;
  let inserted = 0;

  while (lineStart < buf.length) {
    const nl = buf.indexOf(0x0a, lineStart);
    if (nl === -1) break;
    const lineBuf = buf.subarray(lineStart, nl);
    lineStart = nl + 1;

    const line = lineBuf.toString("utf8").trim();
    if (!line) continue;

    try {
      const ev = JSON.parse(line) as Record<string, unknown>;
      if (insertCanonicalEvent(db, ev, blockedIds)) inserted++;
    } catch {
      // skip malformed line
    }
  }

  const newOffset = offset + lineStart;
  db.update(syncState)
    .set({ lastByteOffset: newOffset, ndjsonPath })
    .where(eq(syncState.id, 1))
    .run();

  return { inserted, newOffset };
}
