import {
  Artifact,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  StackTrace,
  StackTraceActions,
  StackTraceContent,
  StackTraceCopyButton,
  StackTraceError,
  StackTraceErrorMessage,
  StackTraceErrorType,
  StackTraceExpandButton,
  StackTraceFrames,
  StackTraceHeader,
} from "@/components/ai-elements/stack-trace";
import { Task, TaskContent, TaskTrigger } from "@/components/ai-elements/task";
import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalTitle,
} from "@/components/ai-elements/terminal";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { FileEditDiffs } from "@/components/code-diff";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CopyIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PathsFileTree } from "./PathsFileTree";
import {
  bool,
  looksLikeJsStack,
  num,
  pickPromptText,
  pickResponseText,
  pickThoughtText,
  str,
  strArray,
  stringifyDetailValue,
  truncateOneLine,
} from "./preview";
import type { EventRow, ParsedDetail } from "./types";

export type RenderEventBodyOptions = {
  selectedConversationId?: string | null;
};

function toolInputValue(d: ParsedDetail): unknown {
  return d.tool_input ?? {};
}

function stackTraceBlock(trace: string, defaultOpen: boolean): ReactNode {
  return (
    <StackTrace defaultOpen={defaultOpen} trace={trace}>
      <StackTraceHeader>
        <StackTraceError>
          <StackTraceErrorType />
          <StackTraceErrorMessage />
        </StackTraceError>
        <StackTraceActions>
          <StackTraceCopyButton />
          <StackTraceExpandButton />
        </StackTraceActions>
      </StackTraceHeader>
      <StackTraceContent>
        <StackTraceFrames showInternalFrames={false} />
      </StackTraceContent>
    </StackTrace>
  );
}

function formatEditsForCopy(d: ParsedDetail): string {
  const e = d.edits;
  if (!e || typeof e !== "object") return stringifyDetailValue(e);
  const rec = e as { items?: unknown; count?: unknown };
  const items = rec.items;
  if (!Array.isArray(items)) return JSON.stringify(e, null, 2);
  return items
    .map((it, i) => {
      const o =
        typeof it === "object" && it !== null
          ? (it as Record<string, unknown>)
          : {};
      return `--- Edit ${i + 1} ---\n- ${stringifyDetailValue(o.old_string)}\n+ ${stringifyDetailValue(o.new_string)}`;
    })
    .join("\n\n");
}

export function renderEventBody(
  event: EventRow,
  d: ParsedDetail,
  options?: RenderEventBodyOptions,
): ReactNode {
  const name = event.hookEventName;
  const selectedConversationId = options?.selectedConversationId ?? null;

  switch (name) {
    case "preToolUse": {
      const tool = str(d.tool_name) ?? "tool";
      return (
        <Tool defaultOpen={false}>
          <ToolHeader
            state="input-available"
            title={truncateOneLine(`${tool}`)}
            toolName={tool}
            type="dynamic-tool"
          />
          <ToolContent>
            <ToolInput input={toolInputValue(d)} />
            {str(d.agent_message) ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Agent message
                </p>
                <CodeBlock
                  code={stringifyDetailValue(d.agent_message)}
                  language="markdown"
                />
              </div>
            ) : null}
            {str(d.cwd) ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">cwd:</span>{" "}
                <span className="font-mono">{d.cwd}</span>
              </p>
            ) : null}
          </ToolContent>
        </Tool>
      );
    }
    case "postToolUse": {
      const tool = str(d.tool_name) ?? "tool";
      const out = stringifyDetailValue(d.tool_output);
      const inner =
        out && looksLikeJsStack(out) ? (
          stackTraceBlock(out, false)
        ) : (
          <ToolOutput errorText={undefined} output={d.tool_output ?? out} />
        );
      return (
        <Tool defaultOpen={false}>
          <ToolHeader
            state="output-available"
            title={truncateOneLine(`${tool}`)}
            toolName={tool}
            type="dynamic-tool"
          />
          <ToolContent>
            <ToolInput input={toolInputValue(d)} />
            {inner}
            {num(d.duration_ms) != null ? (
              <p className="text-xs text-muted-foreground">
                {d.duration_ms} ms
              </p>
            ) : null}
          </ToolContent>
        </Tool>
      );
    }
    case "postToolUseFailure": {
      const tool = str(d.tool_name) ?? "tool";
      const err = str(d.error_message) ?? stringifyDetailValue(d.error_message);
      const stack = err && looksLikeJsStack(err);
      return (
        <Tool defaultOpen={stack}>
          <ToolHeader
            state="output-error"
            title={truncateOneLine(`${tool} failed`)}
            toolName={tool}
            type="dynamic-tool"
          />
          <ToolContent>
            <div className="flex flex-wrap gap-2 text-xs">
              {str(d.failure_type) ? (
                <Badge variant="destructive">{d.failure_type}</Badge>
              ) : null}
              {bool(d.is_interrupt) ? <Badge variant="outline">interrupt</Badge> : null}
            </div>
            {stack ? (
              stackTraceBlock(err, true)
            ) : (
              <ToolOutput errorText={err} output={undefined} />
            )}
            <ToolInput input={toolInputValue(d)} />
          </ToolContent>
        </Tool>
      );
    }
    case "beforeShellExecution": {
      const command = str(d.command) ?? stringifyDetailValue(d.command);
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {bool(d.sandbox) ? <Badge variant="secondary">sandbox</Badge> : null}
            {str(d.cwd) ? (
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">cwd:</span>{" "}
                <span className="font-mono">{d.cwd}</span>
              </span>
            ) : null}
          </div>
          <CodeBlock code={command} language="bash" />
        </div>
      );
    }
    case "afterShellExecution": {
      const command = str(d.command) ?? stringifyDetailValue(d.command);
      const output = str(d.output) ?? stringifyDetailValue(d.output);
      if (output && looksLikeJsStack(output)) {
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Command:</span>{" "}
              <span className="font-mono">{truncateOneLine(command, 200)}</span>
            </p>
            {stackTraceBlock(output, true)}
            {num(d.duration_ms) != null ? (
              <p className="text-xs text-muted-foreground">{d.duration_ms} ms</p>
            ) : null}
          </div>
        );
      }
      return (
        <Terminal autoScroll={false} isStreaming={false} output={output}>
          <TerminalHeader>
            <TerminalTitle>
              {truncateOneLine(command, 80) || "Shell output"}
            </TerminalTitle>
            <TerminalActions>
              <TerminalCopyButton />
            </TerminalActions>
          </TerminalHeader>
          <TerminalContent />
          {num(d.duration_ms) != null ? (
            <p className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-500">
              {d.duration_ms} ms
              {bool(d.sandbox) ? " · sandbox" : ""}
            </p>
          ) : null}
        </Terminal>
      );
    }
    case "beforeMCPExecution": {
      const tool = str(d.tool_name) ?? "mcp";
      return (
        <Tool defaultOpen={false}>
          <ToolHeader
            state="input-available"
            title={truncateOneLine(tool)}
            toolName={tool}
            type="dynamic-tool"
          />
          <ToolContent>
            {str(d.url) ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">URL:</span>{" "}
                <span className="break-all font-mono">{d.url}</span>
              </p>
            ) : null}
            {str(d.mcp_command) ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Command:</span>{" "}
                <span className="font-mono">{d.mcp_command}</span>
              </p>
            ) : null}
            <ToolInput input={toolInputValue(d)} />
          </ToolContent>
        </Tool>
      );
    }
    case "afterMCPExecution": {
      const tool = str(d.tool_name) ?? "mcp";
      const result = stringifyDetailValue(d.result_json);
      const useArtifact = result.length > 2000;
      if (useArtifact) {
        return (
          <Artifact>
            <ArtifactHeader>
              <div className="min-w-0 flex-1">
                <ArtifactTitle>{tool}</ArtifactTitle>
                <ArtifactDescription>
                  MCP result
                  {num(d.duration_ms) != null ? ` · ${d.duration_ms} ms` : ""}
                </ArtifactDescription>
              </div>
              <ArtifactActions>
                <ArtifactAction
                  icon={CopyIcon}
                  label="Copy result"
                  onClick={() => void navigator.clipboard?.writeText(result)}
                  tooltip="Copy result JSON"
                />
              </ArtifactActions>
            </ArtifactHeader>
            <ArtifactContent>
              <ToolInput input={toolInputValue(d)} />
              <CodeBlock code={result} language="json" />
            </ArtifactContent>
          </Artifact>
        );
      }
      return (
        <Tool defaultOpen={false}>
          <ToolHeader
            state="output-available"
            title={truncateOneLine(tool)}
            toolName={tool}
            type="dynamic-tool"
          />
          <ToolContent>
            <ToolInput input={toolInputValue(d)} />
            <ToolOutput errorText={undefined} output={d.result_json ?? result} />
            {num(d.duration_ms) != null ? (
              <p className="text-xs text-muted-foreground">{d.duration_ms} ms</p>
            ) : null}
          </ToolContent>
        </Tool>
      );
    }
    case "beforeReadFile": {
      const path = str(d.file_path) ?? "—";
      const ac = num(d.attachment_count);
      return (
        <div className="space-y-2">
          <p className="font-mono text-sm">{path}</p>
          {ac != null ? (
            <p className="text-xs text-muted-foreground">
              {ac} attachment{ac === 1 ? "" : "s"}
            </p>
          ) : null}
          {str(d.content_preview) || str(d.content) ? (
            <CodeBlock
              code={str(d.content) ?? str(d.content_preview) ?? ""}
              language="text"
            />
          ) : null}
        </div>
      );
    }
    case "afterFileEdit": {
      const path = str(d.file_path) ?? "File";
      const edits = d.edits;
      const count =
        edits &&
        typeof edits === "object" &&
        "count" in edits &&
        typeof (edits as { count: unknown }).count === "number"
          ? (edits as { count: number }).count
          : undefined;
      const copyBody = formatEditsForCopy(d);
      return (
        <Artifact>
          <ArtifactHeader>
            <div className="min-w-0 flex-1">
              <ArtifactTitle className="break-all font-mono">{path}</ArtifactTitle>
              <ArtifactDescription>
                {count != null ? `${count} edit${count === 1 ? "" : "s"}` : "Edits"}
              </ArtifactDescription>
            </div>
            <ArtifactActions>
              <ArtifactAction
                icon={CopyIcon}
                label="Copy edits"
                onClick={() => void navigator.clipboard?.writeText(copyBody)}
                tooltip="Copy edits"
              />
            </ArtifactActions>
          </ArtifactHeader>
          <ArtifactContent className="space-y-3">
            <FileEditDiffs edits={edits} filePath={path} />
          </ArtifactContent>
        </Artifact>
      );
    }
    case "beforeSubmitPrompt": {
      const text = pickPromptText(d) ?? "";
      const ac = num(d.attachment_count);
      return (
        <Message className="max-w-full" from="user">
          <MessageContent>
            {ac != null ? (
              <p className="mb-2 text-xs text-muted-foreground">
                {ac} attachment{ac === 1 ? "" : "s"}
              </p>
            ) : null}
            <MessageResponse>{text || "(empty prompt)"}</MessageResponse>
          </MessageContent>
        </Message>
      );
    }
    case "afterAgentResponse": {
      const text = pickResponseText(d) ?? "";
      return (
        <Message className="max-w-full" from="assistant">
          <MessageContent>
            <MessageResponse>{text || "(empty)"}</MessageResponse>
          </MessageContent>
        </Message>
      );
    }
    case "afterAgentThought": {
      const text = pickThoughtText(d) ?? "";
      const durMs = num(d.duration_ms);
      const durS =
        durMs != null ? Math.max(1, Math.round(durMs / 1000)) : undefined;
      return (
        <Reasoning defaultOpen={false} duration={durS} isStreaming={false}>
          <ReasoningTrigger>
            <span>{durS != null ? `~${durS}s` : "Expand"}</span>
          </ReasoningTrigger>
          <ReasoningContent>{text || "(empty)"}</ReasoningContent>
        </Reasoning>
      );
    }
    case "sessionStart": {
      const sessionId = str(d.session_id);
      const idMatchesSelected =
        sessionId != null &&
        selectedConversationId != null &&
        sessionId === selectedConversationId;
      return (
        <div className="flex flex-wrap gap-2 text-sm">
          {str(d.composer_mode) ? (
            <Badge variant="outline">{d.composer_mode}</Badge>
          ) : null}
          {bool(d.is_background_agent) ? (
            <Badge variant="secondary">background agent</Badge>
          ) : null}
          {sessionId ? (
            idMatchesSelected ? (
              <p className="w-full text-xs text-muted-foreground">
                Same session as above.
              </p>
            ) : (
              <p className="w-full font-mono text-xs text-muted-foreground">
                {sessionId}
              </p>
            )
          ) : null}
        </div>
      );
    }
    case "sessionEnd": {
      const err = str(d.error_message) ?? stringifyDetailValue(d.error_message);
      return (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {str(d.reason) ? <Badge variant="outline">{d.reason}</Badge> : null}
            {d.final_status != null && String(d.final_status).trim() ? (
              <Badge variant="secondary">
                {truncateOneLine(stringifyDetailValue(d.final_status), 80)}
              </Badge>
            ) : null}
          </div>
          {num(d.duration_ms) != null ? (
            <p className="text-xs text-muted-foreground">{d.duration_ms} ms</p>
          ) : null}
          {err && err.length > 0 ? (
            looksLikeJsStack(err) ? (
              stackTraceBlock(err, true)
            ) : (
              <CodeBlock code={err} language="text" />
            )
          ) : null}
        </div>
      );
    }
    case "subagentStart": {
      const task = str(d.task) ?? stringifyDetailValue(d.task);
      const typeLabel = str(d.subagent_type) ?? "subagent";
      return (
        <Task defaultOpen>
          <TaskTrigger
            title={truncateOneLine(
              `${typeLabel} · ${truncateOneLine(task, 60)}`,
              100,
            )}
          />
          <TaskContent className="space-y-2 pl-6 text-sm">
            {str(d.subagent_model) ? (
              <p className="text-xs text-muted-foreground">
                Model: <span className="font-mono">{d.subagent_model}</span>
              </p>
            ) : null}
            <CodeBlock code={task} language="markdown" />
            <div className="space-y-1 font-mono text-xs text-muted-foreground">
              {str(d.subagent_id) ? <p>id: {d.subagent_id}</p> : null}
              {str(d.parent_conversation_id) ? (
                <p>parent: {d.parent_conversation_id}</p>
              ) : null}
              {str(d.git_branch) ? <p>branch: {d.git_branch}</p> : null}
            </div>
          </TaskContent>
        </Task>
      );
    }
    case "subagentStop": {
      const files = strArray(d.modified_files);
      const summaryRaw =
        str(d.summary) ??
        str(d.description) ??
        stringifyDetailValue(d.summary ?? d.description);
      const summary =
        summaryRaw.length > 4000
          ? `${summaryRaw.slice(0, 3997)}…`
          : summaryRaw;
      return (
        <Task defaultOpen>
          <TaskTrigger
            title={truncateOneLine(
              `${str(d.subagent_type) ?? "subagent"} · ${str(d.status) ?? "done"}`,
              100,
            )}
          />
          <TaskContent className="space-y-3 pl-6 text-sm">
            {summary ? (
              <div className="max-w-full text-sm">
                <MessageResponse>{summary}</MessageResponse>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {num(d.duration_ms) != null ? <span>{d.duration_ms} ms</span> : null}
              {num(d.tool_call_count) != null ? (
                <span>{d.tool_call_count} tools</span>
              ) : null}
              {num(d.message_count) != null ? (
                <span>{d.message_count} messages</span>
              ) : null}
            </div>
            {files.length >= 2 ? (
              <PathsFileTree paths={files} />
            ) : files.length === 1 ? (
              <p className="font-mono text-xs">{files[0]}</p>
            ) : null}
          </TaskContent>
        </Task>
      );
    }
    case "preCompact": {
      const pct = num(d.context_usage_percent);
      return (
        <div className="space-y-2">
          {str(d.trigger) ? (
            <p className="text-sm">
              <span className="font-medium">Trigger:</span> {d.trigger}
            </p>
          ) : null}
          {pct != null ? (
            <>
              <Progress value={Math.min(100, Math.max(0, pct))} />
              <p className="text-xs text-muted-foreground">{pct}% context used</p>
            </>
          ) : null}
          <div className="grid gap-1 font-mono text-xs text-muted-foreground">
            {num(d.context_tokens) != null ? (
              <span>tokens: {d.context_tokens}</span>
            ) : null}
            {num(d.context_window_size) != null ? (
              <span>window: {d.context_window_size}</span>
            ) : null}
            {num(d.messages_to_compact) != null ? (
              <span>to compact: {d.messages_to_compact}</span>
            ) : null}
          </div>
        </div>
      );
    }
    case "stop": {
      return (
        <div className="flex flex-wrap gap-2 text-sm">
          {str(d.status) ? <Badge variant="outline">{d.status}</Badge> : null}
          {num(d.loop_count) != null ? (
            <span className="text-xs text-muted-foreground">
              loops: {d.loop_count}
            </span>
          ) : null}
        </div>
      );
    }
    default: {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No dedicated layout for{" "}
            <span className="font-mono text-foreground">{name}</span>.
          </p>
          <CodeBlock code={JSON.stringify(d, null, 2)} language="json" />
        </div>
      );
    }
  }
}
