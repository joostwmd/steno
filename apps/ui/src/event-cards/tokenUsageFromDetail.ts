import { num, str } from "./preview";
import type { ParsedDetail } from "./types";

export type PickedTokenUsage = {
  input?: number;
  output?: number;
  source?: string;
};

/** Hooks that may carry token_usage_* in detail (ingest-normalized). */
export const HOOKS_WITH_TOKEN_USAGE = new Set([
  "beforeSubmitPrompt",
  "afterAgentResponse",
  "afterAgentThought",
]);

export function pickTokenUsage(d: ParsedDetail): PickedTokenUsage {
  const input = num(d.token_usage_input);
  const output = num(d.token_usage_output);
  const source = str(d.token_usage_source);
  if (input == null && output == null) return {};
  return {
    input: input ?? undefined,
    output: output ?? undefined,
    source: source ?? undefined,
  };
}
