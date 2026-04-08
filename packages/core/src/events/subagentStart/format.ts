import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, boolField, strField } from "../common.js";

export function formatSubagentStart(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const subagent_id = strField(o, "subagent_id");
  const subagent_type = strField(o, "subagent_type");
  const task = strField(o, "task");
  const parent_conversation_id = strField(o, "parent_conversation_id");
  const tool_call_id = strField(o, "tool_call_id");
  const subagent_model = strField(o, "subagent_model");
  const is_parallel_worker = boolField(o, "is_parallel_worker");
  const git_branch = strField(o, "git_branch");

  const detail: Record<string, unknown> = {
    subagent_id,
    subagent_type,
    task: previewJsonish(task),
    parent_conversation_id,
    tool_call_id,
    subagent_model,
    is_parallel_worker,
    git_branch,
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "subagentStart",
    kind: "subagent_start",
    detail,
  });
}
