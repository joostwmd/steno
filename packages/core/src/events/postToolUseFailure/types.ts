import type { CursorHookCommonInput } from "../common.js";

export type PostToolUseFailureInput = CursorHookCommonInput & {
  hook_event_name?: "postToolUseFailure";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id: string;
  cwd: string;
  error_message: string;
  failure_type: "timeout" | "error" | "permission_denied";
  duration: number;
  is_interrupt: boolean;
};

export type PostToolUseFailureOutput = Record<string, never>;
