/**
 * Re-exports Cursor hook stdin/stdout JSON shapes from the official Hooks reference.
 * Source of truth per event: `src/events/<hookName>/types.ts`.
 */
export type { CursorHookCommonInput } from "./events/common.js";

export type {
  AfterAgentResponseInput,
  AfterAgentResponseOutput,
} from "./events/afterAgentResponse/types.js";
export type {
  AfterAgentThoughtInput,
  AfterAgentThoughtOutput,
} from "./events/afterAgentThought/types.js";
export type {
  AfterFileEditInput,
  AfterFileEditOutput,
} from "./events/afterFileEdit/types.js";
export type {
  AfterMCPExecutionInput,
  AfterMCPExecutionOutput,
} from "./events/afterMCPExecution/types.js";
export type {
  AfterShellExecutionInput,
  AfterShellExecutionOutput,
} from "./events/afterShellExecution/types.js";
export type {
  BeforeMCPExecutionInput,
  BeforeMCPExecutionOutput,
} from "./events/beforeMCPExecution/types.js";
export type {
  BeforeReadFileInput,
  BeforeReadFileOutput,
} from "./events/beforeReadFile/types.js";
export type {
  BeforeShellExecutionInput,
  BeforeShellExecutionOutput,
} from "./events/beforeShellExecution/types.js";
export type {
  BeforeSubmitPromptInput,
  BeforeSubmitPromptOutput,
} from "./events/beforeSubmitPrompt/types.js";
export type {
  PostToolUseInput,
  PostToolUseOutput,
} from "./events/postToolUse/types.js";
export type {
  PostToolUseFailureInput,
  PostToolUseFailureOutput,
} from "./events/postToolUseFailure/types.js";
export type {
  PreCompactInput,
  PreCompactOutput,
} from "./events/preCompact/types.js";
export type {
  PreToolUseInput,
  PreToolUseOutput,
} from "./events/preToolUse/types.js";
export type {
  SessionEndInput,
  SessionEndOutput,
} from "./events/sessionEnd/types.js";
export type {
  SessionStartInput,
  SessionStartOutput,
} from "./events/sessionStart/types.js";
export type { StopInput, StopOutput } from "./events/stop/types.js";
export type {
  SubagentStartInput,
  SubagentStartOutput,
} from "./events/subagentStart/types.js";
export type {
  SubagentStopInput,
  SubagentStopOutput,
} from "./events/subagentStop/types.js";
