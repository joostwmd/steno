import type { CursorHookCommonInput } from "../common.js";

export type BeforeSubmitPromptInput = CursorHookCommonInput & {
  hook_event_name?: "beforeSubmitPrompt";
  prompt: string;
  attachments: Array<{ type: "file" | "rule"; file_path: string }>;
};

export type BeforeSubmitPromptOutput = {
  continue: boolean;
  user_message?: string;
};
