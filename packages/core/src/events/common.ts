/**
 * Common fields present on hook stdin JSON (Cursor docs: “Input (all hooks)”).
 * Hook-specific payloads extend this shape.
 */
export type CursorHookCommonInput = {
  conversation_id?: string;
  generation_id?: string;
  model?: string;
  hook_event_name?: string;
  cursor_version?: string;
  workspace_roots?: string[];
  user_email?: string | null;
  transcript_path?: string | null;
};

/** @deprecated use CursorHookCommonInput */
export type RawHookPayloadBase = CursorHookCommonInput;

export function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function strField(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
}

export function nullableStrField(
  o: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const v = o[key];
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

export function strArrayField(
  o: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const v = o[key];
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string") out.push(x);
  }
  return out.length ? out : undefined;
}

export function numField(o: Record<string, unknown>, key: string): number | undefined {
  const v = o[key];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  return undefined;
}

export function boolField(o: Record<string, unknown>, key: string): boolean | undefined {
  const v = o[key];
  if (typeof v === "boolean") return v;
  return undefined;
}
