import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { mergeThoughtTokenUsage } from "../../tokenUsage.js";
import { asRecord, numField, strField } from "../common.js";

export function formatAfterAgentThought(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const text = strField(o, "text");
  const duration_ms = numField(o, "duration_ms");

  const detail: Record<string, unknown> = { duration_ms };
  if (text !== undefined) {
    detail.text = text;
  }
  mergeThoughtTokenUsage(o, detail, text);

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "afterAgentThought",
    kind: "agent_thought",
    detail,
  });
}
