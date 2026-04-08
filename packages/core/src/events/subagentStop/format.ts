import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import {
  asRecord,
  nullableStrField,
  numField,
  strArrayField,
  strField,
} from "../common.js";

export function formatSubagentStop(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const subagent_type = strField(o, "subagent_type");
  const status = strField(o, "status");
  const task = strField(o, "task");
  const description = strField(o, "description");
  const summary = strField(o, "summary");
  const duration_ms = numField(o, "duration_ms");
  const message_count = numField(o, "message_count");
  const tool_call_count = numField(o, "tool_call_count");
  const loop_count = numField(o, "loop_count");
  const modified_files = strArrayField(o, "modified_files");
  const agent_transcript_path = nullableStrField(o, "agent_transcript_path");

  const detail: Record<string, unknown> = {
    subagent_type,
    status,
    task: previewJsonish(task),
    description: previewJsonish(description),
    summary: previewJsonish(summary),
    duration_ms,
    message_count,
    tool_call_count,
    loop_count,
    modified_files,
    agent_transcript_path,
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "subagentStop",
    kind: "subagent_stop",
    detail,
  });
}
