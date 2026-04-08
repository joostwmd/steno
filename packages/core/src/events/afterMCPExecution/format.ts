import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, numField, strField } from "../common.js";

export function formatAfterMCPExecution(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const tool_name = strField(o, "tool_name");
  const tool_input = strField(o, "tool_input");
  const result_json = strField(o, "result_json");
  const duration = numField(o, "duration");

  const detail: Record<string, unknown> = {
    tool_name,
    duration_ms: duration,
    tool_input: previewJsonish(tool_input),
    result_json: previewJsonish(result_json),
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "afterMCPExecution",
    kind: "mcp_after",
    detail,
  });
}
