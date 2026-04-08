import type { CursorHookCommonInput } from "../common.js";

export type AfterAgentResponseInput = CursorHookCommonInput & {
  hook_event_name?: "afterAgentResponse";
  text: string;
  /** Legacy / alternate field observed in older payloads */
  response?: string;
  /** When present, ingested as provider token usage (OpenAI / Anthropic shapes). */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

/** Docs: no output fields listed beyond empty */
export type AfterAgentResponseOutput = Record<string, never>;
