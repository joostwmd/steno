import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, strField } from "../common.js";

export function formatBeforeMCPExecution(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const tool_name = strField(o, "tool_name");
  const tool_input = strField(o, "tool_input");
  const url = strField(o, "url");
  const command = strField(o, "command");

  const detail: Record<string, unknown> = {
    tool_name,
    tool_input: previewJsonish(tool_input),
    url,
    mcp_command: command,
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "beforeMCPExecution",
    kind: "mcp_before",
    detail,
  });
}
