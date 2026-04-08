import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { asRecord, boolField, numField, strField } from "../common.js";

export function formatPreCompact(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const trigger = strField(o, "trigger");
  const context_usage_percent = numField(o, "context_usage_percent");
  const context_tokens = numField(o, "context_tokens");
  const context_window_size = numField(o, "context_window_size");
  const message_count = numField(o, "message_count");
  const messages_to_compact = numField(o, "messages_to_compact");
  const is_first_compaction = boolField(o, "is_first_compaction");

  const detail: Record<string, unknown> = {
    trigger,
    context_usage_percent,
    context_tokens,
    context_window_size,
    message_count,
    messages_to_compact,
    is_first_compaction,
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "preCompact",
    kind: "pre_compact",
    detail,
  });
}
