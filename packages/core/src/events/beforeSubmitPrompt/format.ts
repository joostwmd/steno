import type { FormatContext } from "../../formatContext.js";
import { envelopeFromHookRaw } from "../../envelopeFields.js";
import { mergePromptSubmitTokenUsage } from "../../tokenUsage.js";
import { asRecord, strField } from "../common.js";

export function formatBeforeSubmitPrompt(
  raw: unknown,
  ctx: FormatContext,
): ReturnType<typeof envelopeFromHookRaw> {
  const o = asRecord(raw);
  const prompt = strField(o, "prompt");
  const attachments = Array.isArray(o.attachments) ? o.attachments : [];

  const detail: Record<string, unknown> = {
    attachment_count: attachments.length,
  };
  if (prompt !== undefined) {
    detail.prompt = prompt;
  }
  mergePromptSubmitTokenUsage(o, detail, prompt);

  return envelopeFromHookRaw(o, {
    received_at: ctx.receivedAt,
    hook_event_name: "beforeSubmitPrompt",
    kind: "prompt_submit",
    detail,
  });
}
