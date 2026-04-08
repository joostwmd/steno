import type { CursorHookCommonInput } from "../common.js";

export type SessionStartInput = CursorHookCommonInput & {
  hook_event_name?: "sessionStart";
  /** Same as conversation_id per docs */
  session_id: string;
  is_background_agent: boolean;
  composer_mode?: "agent" | "ask" | "edit";
};

export type SessionStartOutput = {
  env?: Record<string, string>;
  additional_context?: string;
  continue?: boolean;
  user_message?: string;
};
