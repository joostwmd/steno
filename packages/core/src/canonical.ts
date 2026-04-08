/** Product schema version — bump only when canonical output shape changes. */
export const CANONICAL_SCHEMA_VERSION = 1 as const;

export type CanonicalEventV1 = {
  schema_version: typeof CANONICAL_SCHEMA_VERSION;
  /** When this process received the hook (ISO 8601). */
  received_at: string;
  /** Cursor hook name exactly as in hooks.json / payload. */
  hook_event_name: string;
  /** Stable category for analytics. */
  kind: string;
  conversation_id?: string;
  generation_id?: string;
  model?: string;
  cursor_version?: string;
  workspace_roots?: string[];
  user_email?: string | null;
  transcript_path?: string | null;
  /** Redacted, structured hook-specific payload. */
  detail: Record<string, unknown>;
};

export type MakeEnvelopeInput = Omit<
  CanonicalEventV1,
  "schema_version" | "received_at"
> & { received_at?: string };

export function makeEnvelope(partial: MakeEnvelopeInput): CanonicalEventV1 {
  return {
    schema_version: CANONICAL_SCHEMA_VERSION,
    received_at: partial.received_at ?? new Date().toISOString(),
    hook_event_name: partial.hook_event_name,
    kind: partial.kind,
    conversation_id: partial.conversation_id,
    generation_id: partial.generation_id,
    model: partial.model,
    cursor_version: partial.cursor_version,
    workspace_roots: partial.workspace_roots,
    user_email: partial.user_email,
    transcript_path: partial.transcript_path,
    detail: partial.detail,
  };
}
