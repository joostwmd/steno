import type { CursorHookCommonInput } from "../common.js";

export type PostToolUseInput = CursorHookCommonInput & {
  hook_event_name?: "postToolUse";
  tool_name: string;
  tool_input: Record<string, unknown>;
  /** JSON-stringified result payload from the tool */
  tool_output: string;
  tool_use_id: string;
  cwd: string;
  duration: number;
};

export type PostToolUseOutput = {
  updated_mcp_tool_output?: Record<string, unknown>;
  additional_context?: string;
};
