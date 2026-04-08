import { makeEnvelope, type CanonicalEventV1 } from "./canonical.js";
import type { FormatContext } from "./formatContext.js";
import { commonEnvelopeFromRaw } from "./envelopeFields.js";
import { redactUnknownDetail } from "./redact.js";
import { asRecord, strField } from "./events/common.js";
import { formatAfterAgentResponse } from "./events/afterAgentResponse/format.js";
import { formatAfterAgentThought } from "./events/afterAgentThought/format.js";
import { formatAfterFileEdit } from "./events/afterFileEdit/format.js";
import { formatAfterMCPExecution } from "./events/afterMCPExecution/format.js";
import { formatAfterShellExecution } from "./events/afterShellExecution/format.js";
import { formatBeforeMCPExecution } from "./events/beforeMCPExecution/format.js";
import { formatBeforeReadFile } from "./events/beforeReadFile/format.js";
import { formatBeforeShellExecution } from "./events/beforeShellExecution/format.js";
import { formatBeforeSubmitPrompt } from "./events/beforeSubmitPrompt/format.js";
import { formatPostToolUse } from "./events/postToolUse/format.js";
import { formatPostToolUseFailure } from "./events/postToolUseFailure/format.js";
import { formatPreCompact } from "./events/preCompact/format.js";
import { formatPreToolUse } from "./events/preToolUse/format.js";
import { formatSessionEnd } from "./events/sessionEnd/format.js";
import { formatSessionStart } from "./events/sessionStart/format.js";
import { formatStop } from "./events/stop/format.js";
import { formatSubagentStart } from "./events/subagentStart/format.js";
import { formatSubagentStop } from "./events/subagentStop/format.js";

export type HookFormatter = (
  raw: unknown,
  ctx: FormatContext,
) => CanonicalEventV1;

const registry: Record<string, HookFormatter> = {
  sessionStart: formatSessionStart,
  sessionEnd: formatSessionEnd,
  preToolUse: formatPreToolUse,
  postToolUse: formatPostToolUse,
  postToolUseFailure: formatPostToolUseFailure,
  subagentStart: formatSubagentStart,
  subagentStop: formatSubagentStop,
  beforeReadFile: formatBeforeReadFile,
  beforeSubmitPrompt: formatBeforeSubmitPrompt,
  afterAgentResponse: formatAfterAgentResponse,
  afterAgentThought: formatAfterAgentThought,
  beforeShellExecution: formatBeforeShellExecution,
  afterShellExecution: formatAfterShellExecution,
  beforeMCPExecution: formatBeforeMCPExecution,
  afterMCPExecution: formatAfterMCPExecution,
  afterFileEdit: formatAfterFileEdit,
  preCompact: formatPreCompact,
  stop: formatStop,
};

export function formatUnknownHook(
  raw: unknown,
  ctx: FormatContext,
): CanonicalEventV1 {
  const o = asRecord(raw);
  const hook_event_name =
    strField(o, "hook_event_name") ?? "unknown_hook_event";

  const detail = redactUnknownDetail(o);

  return makeEnvelope({
    ...commonEnvelopeFromRaw(o),
    received_at: ctx.receivedAt,
    hook_event_name,
    kind: hook_event_name,
    detail,
  });
}

export function formatHookPayload(
  raw: unknown,
  ctx: FormatContext,
): CanonicalEventV1 {
  const o = asRecord(raw);
  const name = strField(o, "hook_event_name");
  if (name && registry[name]) {
    return registry[name]!(raw, ctx);
  }
  return formatUnknownHook(raw, ctx);
}

export const registeredHookEventNames = Object.freeze(
  Object.keys(registry).sort(),
);
