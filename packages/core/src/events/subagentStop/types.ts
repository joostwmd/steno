import type { CursorHookCommonInput } from "../common.js";

export type SubagentStopInput = CursorHookCommonInput & {
  hook_event_name?: "subagentStop";
  subagent_type: string;
  status: "completed" | "error" | "aborted";
  task: string;
  description: string;
  summary: string;
  duration_ms: number;
  message_count: number;
  tool_call_count: number;
  loop_count: number;
  modified_files: string[];
  agent_transcript_path: string | null;
};

export type SubagentStopOutput = {
  followup_message?: string;
};
