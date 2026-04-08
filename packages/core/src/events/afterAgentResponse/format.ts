import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { mergeResponseTokenUsage } from "../../tokenUsage.js";
import { asRecord, strField } from "../common.js";

export function formatAfterAgentResponse(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const text = strField(o, "text") ?? strField(o, "response");

  const detail: Record<string, unknown> = {};
  if (text !== undefined) {
    detail.text = text;
  }
  mergeResponseTokenUsage(o, detail, text);

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "afterAgentResponse",
    kind: "agent_response",
    detail,
  });
}
