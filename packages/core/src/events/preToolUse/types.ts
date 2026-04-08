import type { CursorHookCommonInput } from "../common.js";

export type PreToolUseInput = CursorHookCommonInput & {
  hook_event_name?: "preToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id: string;
  cwd: string;
  agent_message: string;
};

export type PreToolUseOutput = {
  permission: "allow" | "deny" | "ask";
  user_message?: string;
  agent_message?: string;
  updated_input?: Record<string, unknown>;
};
