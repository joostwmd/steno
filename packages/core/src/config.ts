import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

/** Resolved config shape used by ingest and server (JSON-compatible keys). */
export type StenoConfig = {
  /** Append-only NDJSON log path (absolute or relative to repo root). */
  log_path?: string;
  /** SQLite DB path for the monitoring UI (absolute or relative to repo root). */
  sqlite_path?: string;
  /** Port for the local monitoring server. */
  ui_port?: number;
};

/** User-facing options in `steno.config.ts` (camelCase). */
export type StenoConfigInput = {
  logPath?: string;
  sqlitePath?: string;
  uiPort?: number;
};

export function defineStenoConfig(input: StenoConfigInput): StenoConfigInput {
  return input;
}

function inputToResolved(input: StenoConfigInput | undefined): StenoConfig {
  if (!input) return {};
  return {
    log_path: input.logPath,
    sqlite_path: input.sqlitePath,
    ui_port: input.uiPort,
  };
}

const DEFAULT_RELATIVE_LOG = join("steno", "events.ndjson");
const DEFAULT_RELATIVE_SQLITE = join("steno", "steno.db");

function loadStenoConfigTs(repoRoot: string): StenoConfigInput | undefined {
  const tsPath = join(repoRoot, "steno.config.ts");
  const mtsPath = join(repoRoot, "steno.config.mts");
  const file = existsSync(tsPath) ? tsPath : existsSync(mtsPath) ? mtsPath : null;
  if (!file) return undefined;

  try {
    const jiti = createJiti(fileURLToPath(import.meta.url), {
      interopDefault: true,
    });
    const mod = jiti(file) as {
      default?: StenoConfigInput;
      config?: StenoConfigInput;
    };
    const raw = mod.default ?? mod.config;
    if (!raw || typeof raw !== "object") return {};
    return raw as StenoConfigInput;
  } catch {
    return {};
  }
}

/**
 * Load `steno.config.ts` (or `.mts`). Missing file or empty export → `{}` so
 * `resolveLogPath` / `resolveSqlitePath` use defaults under `steno/`.
 */
export function loadStenoConfig(repoRoot: string): StenoConfig {
  const fromTs = loadStenoConfigTs(repoRoot);
  if (!fromTs || Object.keys(fromTs).length === 0) {
    return {};
  }
  return inputToResolved(fromTs);
}

/** @deprecated Use `loadStenoConfig` */
export function loadTelemetryConfig(repoRoot: string): StenoConfig {
  return loadStenoConfig(repoRoot);
}

export function resolveLogPath(repoRoot: string, cfg: StenoConfig): string {
  const rel = cfg.log_path?.trim();
  if (!rel) {
    return join(repoRoot, DEFAULT_RELATIVE_LOG);
  }
  if (rel.startsWith("/")) {
    return rel;
  }
  return join(repoRoot, rel);
}

export function resolveSqlitePath(repoRoot: string, cfg: StenoConfig): string {
  const rel = cfg.sqlite_path?.trim();
  if (!rel) {
    return join(repoRoot, DEFAULT_RELATIVE_SQLITE);
  }
  if (rel.startsWith("/")) {
    return rel;
  }
  return join(repoRoot, rel);
}
