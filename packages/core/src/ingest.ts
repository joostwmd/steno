import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadStenoConfig,
  resolveLogPath,
  resolveSqlitePath,
} from "./config.js";
import { formatHookPayload } from "./dispatch.js";
import type { FormatContext } from "./formatContext.js";

/** `beforeReadFile` includes `file_path` (agent tool read, not tab buffers). */
const FILE_PATH_HOOKS = new Set(["beforeReadFile"]);

/**
 * Avoid a feedback loop: opening `events.ndjson` can trigger `beforeReadFile`
 * when the agent reads it; appending would change the file and repeat.
 */
function isSelfTelemetryTarget(
  raw: unknown,
  logPathAbs: string,
  sqlitePathAbs: string,
): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const hook = o.hook_event_name;
  if (typeof hook !== "string" || !FILE_PATH_HOOKS.has(hook)) return false;
  const fp = o.file_path;
  if (typeof fp !== "string" || !fp.trim()) return false;
  let abs: string;
  try {
    abs = resolve(fp);
  } catch {
    return false;
  }
  return abs === logPathAbs || abs === sqlitePathAbs;
}

/**
 * Optional project root as `node …/ingest.js <repoRoot>`.
 * When started via the `steno` CLI, `argv[1]` is `cli.js`, so we ignore argv here.
 */
function repoRootFromArgv(): string | undefined {
  try {
    const invoked = process.argv[1] ? resolve(process.argv[1]) : "";
    const thisFile = resolve(fileURLToPath(import.meta.url));
    if (invoked !== thisFile) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  const a = process.argv[2]?.trim();
  if (a) return resolve(a);
  return undefined;
}

function repoRootFromEnv(): string | undefined {
  const fromEnv =
    process.env.STENO_REPO_ROOT?.trim() ||
    process.env.STENOGRAPHER_REPO_ROOT?.trim() ||
    process.env.STENOGRAPHER_PROJECT?.trim() ||
    process.env.CURSOR_PROJECT_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  return undefined;
}

/** Walk up from `start` for `package.json`. */
function repoRootFromWalk(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/** Monorepo dev: `packages/core/dist/ingest.js` → repo root. */
function repoRootFromIngestModule(): string {
  const ingestFile = fileURLToPath(import.meta.url);
  let d = dirname(ingestFile);
  d = dirname(d);
  d = dirname(d);
  d = dirname(d);
  return d;
}

export function resolveRepoRoot(): string {
  return (
    repoRootFromArgv() ??
    repoRootFromEnv() ??
    repoRootFromWalk(process.cwd()) ??
    repoRootFromIngestModule()
  );
}

async function readStdinUtf8(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function ensureDirForFile(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

/**
 * Cursor hook entrypoint: read JSON from stdin, append one canonical NDJSON line.
 * Always exits 0 so the IDE session is never blocked.
 */
export async function runIngest(): Promise<void> {
  const repoRoot = resolveRepoRoot();
  const cfg = loadStenoConfig(repoRoot);
  const logPath = resolve(resolveLogPath(repoRoot, cfg));
  const sqlitePath = resolve(resolveSqlitePath(repoRoot, cfg));
  const receivedAt = new Date().toISOString();

  let line: string;
  try {
    const text = (await readStdinUtf8()).trim();
    if (!text) {
      line = JSON.stringify({
        schema_version: 1,
        received_at: receivedAt,
        hook_event_name: "empty_stdin",
        kind: "ingest_error",
        detail: { message: "no stdin" },
      });
    } else {
      const raw = JSON.parse(text) as unknown;
      if (
        process.env.STENO_LOG_SELF_TELEMETRY !== "1" &&
        process.env.STENOGRAPHER_LOG_SELF_TELEMETRY !== "1" &&
        isSelfTelemetryTarget(raw, logPath, sqlitePath)
      ) {
        return;
      }
      const ctx: FormatContext = { receivedAt };
      const canonical = formatHookPayload(raw, ctx);
      line = JSON.stringify(canonical);
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    line = JSON.stringify({
      schema_version: 1,
      received_at: receivedAt,
      hook_event_name: "ingest_parse_error",
      kind: "ingest_error",
      detail: { message: err },
    });
  }

  try {
    ensureDirForFile(logPath);
    appendFileSync(logPath, `${line}\n`, "utf8");
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error(`[steno] failed to write log: ${err}`);
  }
}
