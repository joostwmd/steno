import type { CursorHookCommonInput } from "../common.js";

export type StopInput = CursorHookCommonInput & {
  hook_event_name?: "stop";
  status: "completed" | "aborted" | "error";
  loop_count: number;
};

export type StopOutput = {
  followup_message?: string;
};
