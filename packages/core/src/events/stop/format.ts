import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { asRecord, numField, strField } from "../common.js";

export function formatStop(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  void ctx;
  const o = asRecord(raw);
  const status = strField(o, "status");
  const loop_count = numField(o, "loop_count");

  const detail: Record<string, unknown> = {
    status,
    loop_count,
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "stop",
    kind: "stop",
    detail,
  });
}
