import type { CursorHookCommonInput } from "../common.js";

export type SessionEndInput = CursorHookCommonInput & {
  hook_event_name?: "sessionEnd";
  session_id: string;
  reason: "completed" | "aborted" | "error" | "window_close" | "user_close";
  duration_ms: number;
  is_background_agent: boolean;
  final_status: string;
  error_message?: string;
};

export type SessionEndOutput = Record<string, never>;
