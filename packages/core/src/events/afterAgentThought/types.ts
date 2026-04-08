import type { CursorHookCommonInput } from "../common.js";

export type AfterAgentThoughtInput = CursorHookCommonInput & {
  hook_event_name?: "afterAgentThought";
  text: string;
  duration_ms?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  input_tokens?: number;
  output_tokens?: number;
};

export type AfterAgentThoughtOutput = Record<string, never>;
