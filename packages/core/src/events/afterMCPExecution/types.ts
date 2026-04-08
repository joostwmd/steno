import type { CursorHookCommonInput } from "../common.js";

export type AfterMCPExecutionInput = CursorHookCommonInput & {
  hook_event_name?: "afterMCPExecution";
  tool_name: string;
  tool_input: string;
  result_json: string;
  duration: number;
};

export type AfterMCPExecutionOutput = Record<string, unknown>;
