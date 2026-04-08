import type { CursorHookCommonInput } from "../common.js";

export type BeforeMCPExecutionInput = CursorHookCommonInput & {
  hook_event_name?: "beforeMCPExecution";
  tool_name: string;
  /** JSON params string passed to the tool */
  tool_input: string;
  /** Present for HTTP MCP servers */
  url?: string;
  /** Present for stdio/command-based MCP */
  command?: string;
};

export type BeforeMCPExecutionOutput = {
  permission: "allow" | "deny" | "ask";
  user_message?: string;
  agent_message?: string;
};
