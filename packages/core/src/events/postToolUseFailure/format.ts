import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, boolField, numField, strField } from "../common.js";

export function formatPostToolUseFailure(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const tool_name = strField(o, "tool_name");
  const tool_use_id = strField(o, "tool_use_id");
  const cwd = strField(o, "cwd");
  const error_message = strField(o, "error_message");
  const failure_type = strField(o, "failure_type");
  const duration = numField(o, "duration");
  const is_interrupt = boolField(o, "is_interrupt");

  const detail: Record<string, unknown> = {
    tool_name,
    tool_use_id,
    cwd,
    failure_type,
    duration_ms: duration,
    is_interrupt,
    error_message: previewJsonish(error_message),
    tool_input: previewJsonish(o.tool_input),
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "postToolUseFailure",
    kind: "post_tool_use_failure",
    detail,
  });
}
