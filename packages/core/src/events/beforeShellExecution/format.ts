import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, boolField, strField } from "../common.js";

export function formatBeforeShellExecution(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const command = strField(o, "command");
  const cwd = strField(o, "cwd");
  const sandbox = boolField(o, "sandbox");

  const detail: Record<string, unknown> = {
    cwd,
    sandbox,
    command: previewJsonish(command),
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "beforeShellExecution",
    kind: "shell_before",
    detail,
  });
}
