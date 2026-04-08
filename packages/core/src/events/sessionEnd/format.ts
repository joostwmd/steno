import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, boolField, numField, strField } from "../common.js";

export function formatSessionEnd(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const session_id = strField(o, "session_id");
  const reason = strField(o, "reason");
  const duration_ms = numField(o, "duration_ms");
  const is_background_agent = boolField(o, "is_background_agent");
  const final_status = strField(o, "final_status");
  const error_message = strField(o, "error_message");

  const detail: Record<string, unknown> = {
    session_id,
    reason,
    duration_ms,
    is_background_agent,
    final_status: previewJsonish(final_status),
    error_message: previewJsonish(error_message),
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "sessionEnd",
    kind: "session_end",
    detail,
  });
}
