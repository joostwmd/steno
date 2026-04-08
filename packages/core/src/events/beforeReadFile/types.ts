import type { CursorHookCommonInput } from "../common.js";

/** Cursor docs: beforeReadFile — input */
export type BeforeReadFileInput = CursorHookCommonInput & {
  hook_event_name?: "beforeReadFile";
  file_path: string;
  content: string;
  attachments: Array<{ type: "file" | "rule"; file_path: string }>;
};

/** Cursor docs: beforeReadFile — output (stdout JSON) */
export type BeforeReadFileOutput = {
  permission: "allow" | "deny";
  user_message?: string;
};
