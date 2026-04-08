import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { previewJsonish } from "../../jsonPreview.js";
import { asRecord, strField } from "../common.js";

function mapEdits(edits: unknown): Record<string, unknown> {
  if (!Array.isArray(edits)) {
    return { count: 0, items: [] };
  }
  const items = edits.map((entry, index) => {
    const r =
      typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>)
        : {};
    const old_string = typeof r.old_string === "string" ? r.old_string : undefined;
    const new_string = typeof r.new_string === "string" ? r.new_string : undefined;
    return {
      index,
      old_string: previewJsonish(old_string),
      new_string: previewJsonish(new_string),
    };
  });
  return { count: items.length, items };
}

export function formatAfterFileEdit(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const file_path = strField(o, "file_path");

  const detail: Record<string, unknown> = {
    file_path,
    edits: mapEdits(o.edits),
  };

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "afterFileEdit",
    kind: "file_edit",
    detail,
  });
}
