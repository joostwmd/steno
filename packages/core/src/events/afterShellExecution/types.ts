import type { CursorHookCommonInput } from "../common.js";

export type AfterShellExecutionInput = CursorHookCommonInput & {
  hook_event_name?: "afterShellExecution";
  command: string;
  output: string;
  duration: number;
  sandbox: boolean;
};

/** Docs: observational; no structured output fields */
export type AfterShellExecutionOutput = Record<string, unknown>;
