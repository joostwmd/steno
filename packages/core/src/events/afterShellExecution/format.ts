import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, boolField, numField, strField } from "../common.js";

export function formatAfterShellExecution(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const command = strField(o, "command");
  const output = strField(o, "output");
  const duration = numField(o, "duration");
  const sandbox = boolField(o, "sandbox");

  const detail: Record<string, unknown> = {
    duration_ms: duration,
    sandbox,
    command: previewJsonish(command),
    output: previewJsonish(output),
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "afterShellExecution",
    kind: "shell_after",
    detail,
  });
}
