import type { CursorHookCommonInput } from "../common.js";

export type PreCompactInput = CursorHookCommonInput & {
  hook_event_name?: "preCompact";
  trigger: "auto" | "manual";
  context_usage_percent: number;
  context_tokens: number;
  context_window_size: number;
  message_count: number;
  messages_to_compact: number;
  is_first_compaction: boolean;
};

export type PreCompactOutput = {
  user_message?: string;
};
