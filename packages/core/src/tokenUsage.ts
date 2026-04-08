import { getEncoding, type Tiktoken } from "js-tiktoken";
import { strField } from "./events/common.js";

export type TokenUsageSource = "provider" | "estimated";

let cl100k: Tiktoken | null = null;
let o200k: Tiktoken | null = null;

function encodingForEstimate(modelId: string | undefined): Tiktoken {
  const m = (modelId ?? "").toLowerCase();
  const useO200k =
    m.includes("gpt-4o") ||
    m.includes("o1") ||
    m.includes("o3") ||
    m.includes("o4") ||
    m.includes("gpt-5") ||
    m.includes("chatgpt-4o");
  if (useO200k) {
    if (!o200k) o200k = getEncoding("o200k_base");
    return o200k;
  }
  if (!cl100k) cl100k = getEncoding("cl100k_base");
  return cl100k;
}

/** Best-effort token count for estimation (Claude and unknown models use cl100k as a rough proxy). */
export function countTokensForModelEstimate(
  modelId: string | undefined,
  text: string,
): number {
  if (!text) return 0;
  try {
    return encodingForEstimate(modelId).encode(text).length;
  } catch {
    return Math.max(0, Math.ceil(text.length / 4));
  }
}

function nonNegInt(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
    return undefined;
  }
  return v;
}

function usagePairFromRecord(rec: Record<string, unknown>): {
  input?: number;
  output?: number;
} {
  const input =
    nonNegInt(rec.prompt_tokens) ??
    nonNegInt(rec.input_tokens) ??
    nonNegInt(rec.promptTokens) ??
    nonNegInt(rec.inputTokens);
  const output =
    nonNegInt(rec.completion_tokens) ??
    nonNegInt(rec.output_tokens) ??
    nonNegInt(rec.completionTokens) ??
    nonNegInt(rec.outputTokens);
  return { input, output };
}

/**
 * Reads provider usage from common Cursor / OpenAI / Anthropic-shaped payloads.
 * Returns a pair only when both input and output are present (integers ≥ 0).
 */
export function extractTokenUsage(
  raw: Record<string, unknown>,
): { input: number; output: number } | undefined {
  let input = nonNegInt(raw.input_tokens) ?? nonNegInt(raw.prompt_tokens);
  let output =
    nonNegInt(raw.output_tokens) ?? nonNegInt(raw.completion_tokens);

  const usage = raw.usage;
  if (usage && typeof usage === "object" && !Array.isArray(usage)) {
    const inner = usagePairFromRecord(usage as Record<string, unknown>);
    input = input ?? inner.input;
    output = output ?? inner.output;
  }

  if (input !== undefined && output !== undefined) {
    return { input, output };
  }
  return undefined;
}

function assignProvider(
  detail: Record<string, unknown>,
  input: number,
  output: number,
): void {
  detail.token_usage_input = input;
  detail.token_usage_output = output;
  detail.token_usage_source = "provider" satisfies TokenUsageSource;
}

function assignEstimatedOutput(
  detail: Record<string, unknown>,
  modelId: string | undefined,
  text: string,
): void {
  detail.token_usage_output = countTokensForModelEstimate(modelId, text);
  detail.token_usage_source = "estimated" satisfies TokenUsageSource;
}

function assignEstimatedInput(
  detail: Record<string, unknown>,
  modelId: string | undefined,
  text: string,
): void {
  detail.token_usage_input = countTokensForModelEstimate(modelId, text);
  detail.token_usage_source = "estimated" satisfies TokenUsageSource;
}

/** afterAgentResponse: provider usage, else estimated output only. */
export function mergeResponseTokenUsage(
  raw: Record<string, unknown>,
  detail: Record<string, unknown>,
  responseText: string | undefined,
): void {
  const provider = extractTokenUsage(raw);
  if (provider) {
    assignProvider(detail, provider.input, provider.output);
    return;
  }
  const body = responseText ?? "";
  if (body.length === 0) return;
  assignEstimatedOutput(detail, strField(raw, "model"), body);
}

/** beforeSubmitPrompt: estimated input from user prompt text only. */
export function mergePromptSubmitTokenUsage(
  raw: Record<string, unknown>,
  detail: Record<string, unknown>,
  prompt: string | undefined,
): void {
  const p = prompt ?? "";
  if (p.length === 0) return;
  assignEstimatedInput(detail, strField(raw, "model"), p);
}

/** afterAgentThought: provider usage, else estimated output from thought text. */
export function mergeThoughtTokenUsage(
  raw: Record<string, unknown>,
  detail: Record<string, unknown>,
  thoughtText: string | undefined,
): void {
  const provider = extractTokenUsage(raw);
  if (provider) {
    assignProvider(detail, provider.input, provider.output);
    return;
  }
  const body = thoughtText ?? "";
  if (body.length === 0) return;
  assignEstimatedOutput(detail, strField(raw, "model"), body);
}
