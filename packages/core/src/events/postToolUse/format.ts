import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, numField, strField } from "../common.js";

export function formatPostToolUse(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const tool_name = strField(o, "tool_name");
  const tool_use_id = strField(o, "tool_use_id");
  const cwd = strField(o, "cwd");
  const tool_output = strField(o, "tool_output");
  const duration = numField(o, "duration");

  const detail: Record<string, unknown> = {
    tool_name,
    tool_use_id,
    cwd,
    duration_ms: duration,
    tool_input: previewJsonish(o.tool_input),
    tool_output: previewJsonish(tool_output),
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "postToolUse",
    kind: "post_tool_use",
    detail,
  });
}
