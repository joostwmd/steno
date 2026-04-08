import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { asRecord, strField } from "../common.js";

export function formatBeforeReadFile(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const file_path = strField(o, "file_path");
  const content = strField(o, "content");
  const attachments = Array.isArray(o.attachments) ? o.attachments : [];

  const detail: Record<string, unknown> = {
    file_path,
    attachment_count: attachments.length,
  };
  if (content !== undefined) {
    detail.content = content;
  }

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "beforeReadFile",
    kind: "file_read",
    detail,
  });
}
