import type { CursorHookCommonInput } from "../common.js";

export type FileEditChunk = {
  old_string: string;
  new_string: string;
};

export type AfterFileEditInput = CursorHookCommonInput & {
  hook_event_name?: "afterFileEdit";
  file_path: string;
  edits: FileEditChunk[];
};

export type AfterFileEditOutput = Record<string, unknown>;
