import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { asRecord, boolField, strField } from "../common.js";

export function formatSessionStart(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const session_id = strField(o, "session_id");
  const is_background_agent = boolField(o, "is_background_agent");
  const composer_mode = strField(o, "composer_mode");

  const detail: Record<string, unknown> = {
    session_id,
    is_background_agent,
    composer_mode,
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "sessionStart",
    kind: "session_start",
    detail,
  });
}
