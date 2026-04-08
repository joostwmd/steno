import { makeEnvelope, type CanonicalEventV1 } from "./canonical.js";
import {
  asRecord,
  nullableStrField,
  strArrayField,
  strField,
} from "./events/common.js";

export type CommonEnvelopeSlice = Pick<
  CanonicalEventV1,
  | "conversation_id"
  | "generation_id"
  | "model"
  | "cursor_version"
  | "workspace_roots"
  | "user_email"
  | "transcript_path"
>;

export function commonEnvelopeFromRaw(
  o: Record<string, unknown>,
): CommonEnvelopeSlice {
  return {
    conversation_id: strField(o, "conversation_id"),
    generation_id: strField(o, "generation_id"),
    model: strField(o, "model"),
    cursor_version: strField(o, "cursor_version"),
    workspace_roots: strArrayField(o, "workspace_roots"),
    user_email: nullableStrField(o, "user_email"),
    transcript_path: nullableStrField(o, "transcript_path"),
  };
}

export function envelopeFromHookRaw(
  raw: Record<string, unknown>,
  patch: {
    received_at: string;
    hook_event_name: string;
    kind: string;
    detail: Record<string, unknown>;
  },
): CanonicalEventV1 {
  return makeEnvelope({
    ...commonEnvelopeFromRaw(raw),
    received_at: patch.received_at,
    hook_event_name: patch.hook_event_name,
    kind: patch.kind,
    detail: patch.detail,
  });
}

export { asRecord };
