"use client";

import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { createTwoFilesPatch } from "diff";
import { ChevronDownIcon, FileIcon } from "lucide-react";
import type { BundledLanguage } from "shiki";

export type EditHunk = {
  index: number;
  oldString: string;
  newString: string;
};

function coerceStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === undefined || v === null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Parse `detail.edits` from afterFileEdit canonical shape. */
export function parseEditHunks(edits: unknown): EditHunk[] {
  if (!edits || typeof edits !== "object") return [];
  const rec = edits as { items?: unknown };
  if (!Array.isArray(rec.items)) return [];
  return rec.items.map((it, i) => {
    const o =
      typeof it === "object" && it !== null
        ? (it as Record<string, unknown>)
        : {};
    const idx = typeof o.index === "number" ? o.index : i;
    return {
      index: idx,
      oldString: coerceStr(o.old_string),
      newString: coerceStr(o.new_string),
    };
  });
}

const EXT_LANG: Record<string, BundledLanguage> = {
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  swift: "swift",
  rb: "ruby",
  php: "php",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
};

export function guessLanguageFromPath(filePath: string): BundledLanguage {
  const base = filePath.split(/[/\\]/).pop() ?? filePath;
  const dot = base.lastIndexOf(".");
  if (dot === -1) return "text";
  const ext = base.slice(dot + 1).toLowerCase();
  return EXT_LANG[ext] ?? "text";
}

export function buildUnifiedDiffPatch(
  filePath: string,
  oldStr: string,
  newStr: string,
): string {
  const label = filePath.split(/[/\\]/).pop() ?? filePath;
  return createTwoFilesPatch(
    `a/${label}`,
    `b/${label}`,
    oldStr,
    newStr,
    undefined,
    undefined,
    { context: 3 },
  );
}

function unifiedDiffLineClass(line: string): string {
  if (
    line.startsWith("+++ ") ||
    line.startsWith("--- ") ||
    line.startsWith("diff ")
  ) {
    return "border-transparent bg-muted/50 text-muted-foreground";
  }
  if (line.startsWith("@@")) {
    return "border-blue-500/50 bg-blue-500/[0.12] text-foreground dark:bg-blue-500/20";
  }
  if (line.startsWith("+")) {
    return "border-emerald-600/55 bg-emerald-500/[0.16] text-foreground dark:border-emerald-500/45 dark:bg-emerald-500/[0.22]";
  }
  if (line.startsWith("-")) {
    return "border-rose-600/55 bg-rose-500/[0.14] text-foreground dark:border-rose-500/45 dark:bg-rose-500/[0.2]";
  }
  return "border-transparent bg-muted/15";
}

function UnifiedDiffView({ patch }: { patch: string }) {
  const lines = patch.endsWith("\n") ? patch.slice(0, -1).split("\n") : patch.split("\n");
  return (
    <pre className="m-0 overflow-auto p-0 font-mono text-[13px] leading-[1.45]">
      <code className="block min-w-0">
        {lines.map((line, i) => (
          <span
            key={`diff-line-${i}`}
            className={cn(
              "block w-full border-l-[3px] py-px pl-2 pr-2 whitespace-pre-wrap break-all",
              unifiedDiffLineClass(line),
            )}
          >
            {line.length > 0 ? line : "\u00a0"}
          </span>
        ))}
      </code>
    </pre>
  );
}

export type CodeComparisonProps = {
  filename: string;
  beforeCode: string;
  afterCode: string;
  language?: BundledLanguage;
  className?: string;
  /** Show collapsible unified diff (git-style) below the split view. */
  showUnifiedDiff?: boolean;
  defaultUnifiedOpen?: boolean;
};

/**
 * Side-by-side before/after with optional unified diff (Shiki-highlighted).
 */
export function CodeComparison({
  filename,
  beforeCode,
  afterCode,
  language: languageProp,
  className,
  showUnifiedDiff = true,
  defaultUnifiedOpen = false,
}: CodeComparisonProps) {
  const language = languageProp ?? guessLanguageFromPath(filename);
  const unified =
    showUnifiedDiff && (beforeCode || afterCode)
      ? buildUnifiedDiffPatch(filename, beforeCode, afterCode)
      : "";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid divide-border md:grid-cols-2 md:divide-x">
          <div className="flex min-h-0 min-w-0 flex-col border-b border-border bg-rose-500/[0.07] md:border-b-0 dark:bg-rose-950/40">
            <div className="flex items-center gap-2 border-b border-rose-500/20 bg-rose-500/[0.1] px-3 py-2 text-xs font-medium text-rose-950/80 dark:border-rose-500/25 dark:bg-rose-950/50 dark:text-rose-100/90">
              <FileIcon className="size-3.5 shrink-0" />
              <span className="truncate">{filename}</span>
              <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">
                Before
              </span>
            </div>
            <div className="max-h-[min(55vh,520px)] min-h-[120px] overflow-auto">
              <CodeBlock
                className="rounded-none border-0 bg-transparent shadow-none"
                code={beforeCode || " "}
                language={language}
              />
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col bg-emerald-500/[0.07] dark:bg-emerald-950/40">
            <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/[0.1] px-3 py-2 text-xs font-medium text-emerald-950/80 dark:border-emerald-500/25 dark:bg-emerald-950/50 dark:text-emerald-100/90">
              <FileIcon className="size-3.5 shrink-0" />
              <span className="truncate">{filename}</span>
              <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                After
              </span>
            </div>
            <div className="max-h-[min(55vh,520px)] min-h-[120px] overflow-auto">
              <CodeBlock
                className="rounded-none border-0 bg-transparent shadow-none"
                code={afterCode || " "}
                language={language}
              />
            </div>
          </div>
        </div>
      </div>

      {unified ? (
        <Collapsible className="group" defaultOpen={defaultUnifiedOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50">
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            Unified diff
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 overflow-hidden rounded-md border border-border bg-card">
            <div className="max-h-[min(60vh,560px)] overflow-auto">
              <UnifiedDiffView patch={unified} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

export type FileEditDiffsProps = {
  filePath: string;
  edits: unknown;
  className?: string;
};

/** Renders all hunks from `detail.edits` for an afterFileEdit event. */
export function FileEditDiffs({ filePath, edits, className }: FileEditDiffsProps) {
  const hunks = parseEditHunks(edits);
  if (hunks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No edit hunks in payload.</p>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {hunks.map((h, i) => (
        <div className="space-y-2" key={`hunk-${h.index}-${i}`}>
          <p className="text-xs font-medium text-muted-foreground">
            Edit {h.index + 1}
          </p>
          <CodeComparison
            afterCode={h.newString}
            beforeCode={h.oldString}
            filename={filePath}
          />
        </div>
      ))}
    </div>
  );
}
