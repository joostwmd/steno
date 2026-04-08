import type { CursorHookCommonInput } from "../common.js";

export type SubagentStartInput = CursorHookCommonInput & {
  hook_event_name?: "subagentStart";
  subagent_id: string;
  subagent_type: string;
  task: string;
  parent_conversation_id: string;
  tool_call_id: string;
  subagent_model: string;
  is_parallel_worker: boolean;
  git_branch?: string;
};

export type SubagentStartOutput = {
  permission: "allow" | "deny";
  user_message?: string;
};
