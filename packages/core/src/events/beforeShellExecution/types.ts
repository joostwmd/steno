import type { CursorHookCommonInput } from "../common.js";

export type BeforeShellExecutionInput = CursorHookCommonInput & {
  hook_event_name?: "beforeShellExecution";
  command: string;
  cwd: string;
  sandbox: boolean;
};

export type BeforeShellExecutionOutput = {
  permission: "allow" | "deny" | "ask";
  user_message?: string;
  agent_message?: string;
};
