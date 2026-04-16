import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import { migrationsDir } from "./bundlePaths.js";

/** Published npm package name (scoped). */
export const STENO_NPM_PACKAGE = "@joostwmd/steno" as const;

/** Version from `packages/steno/package.json` next to the running CLI (works bundled or from source). */
export function readInstalledStenoPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, "..", "package.json");
  try {
    const meta = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      version?: string;
    };
    return typeof meta.version === "string" ? meta.version : "0.1.0";
  } catch {
    return "0.1.0";
  }
}

const HOOK_NAMES = [
  "sessionStart",
  "sessionEnd",
  "preToolUse",
  "postToolUse",
  "postToolUseFailure",
  "subagentStart",
  "subagentStop",
  "beforeShellExecution",
  "afterShellExecution",
  "beforeMCPExecution",
  "afterMCPExecution",
  "beforeReadFile",
  "afterFileEdit",
  "beforeSubmitPrompt",
  "preCompact",
  "stop",
  "afterAgentResponse",
  "afterAgentThought",
] as const;

type HooksFile = {
  version: number;
  hooks: Record<string, { command: string }[]>;
};

function parseInitArgs(argv: string[]): {
  yes: boolean;
  resetData: boolean;
  pm: "npm" | "pnpm" | null;
  merge: boolean;
  replace: boolean;
  hooksModeExplicit: boolean;
  eventsPath: string;
  sqlitePath: string;
  port: number;
  stenoVersion: string;
} {
  let yes = false;
  let resetData = false;
  let pm: "npm" | "pnpm" | null = null;
  let merge = false;
  let replace = false;
  let hooksModeExplicit = false;
  let eventsPath = "steno/events.ndjson";
  let sqlitePath = "steno/steno.db";
  let port = 8787;
  let stenoVersion = readInstalledStenoPackageVersion();

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes" || a === "-y") yes = true;
    else if (a === "--reset-data") resetData = true;
    else if (a === "--merge") {
      merge = true;
      hooksModeExplicit = true;
    } else if (a === "--replace") {
      replace = true;
      hooksModeExplicit = true;
    } else if (a === "--pm" && argv[i + 1]) {
      const v = argv[++i];
      if (v === "npm" || v === "pnpm") pm = v;
    } else if (a === "--events-path" && argv[i + 1]) {
      eventsPath = argv[++i];
    } else if (a === "--sqlite-path" && argv[i + 1]) {
      sqlitePath = argv[++i];
    } else if (a === "--port" && argv[i + 1]) {
      port = Number(argv[++i]) || 8787;
    } else if (a === "--steno-version" && argv[i + 1]) {
      stenoVersion = argv[++i];
    }
  }

  if (merge && replace) {
    merge = false;
  }

  return {
    yes,
    resetData,
    pm,
    merge,
    replace,
    hooksModeExplicit,
    eventsPath,
    sqlitePath,
    port,
    stenoVersion,
  };
}

function hookCommand(pm: "npm" | "pnpm"): string {
  return pm === "pnpm"
    ? "pnpm run steno:ingest --silent"
    : "npm run steno:ingest --silent";
}

function buildHooksJson(pm: "npm" | "pnpm"): HooksFile {
  const cmd = hookCommand(pm);
  const hooks: HooksFile["hooks"] = {};
  for (const name of HOOK_NAMES) {
    hooks[name] = [{ command: cmd }];
  }
  return { version: 1, hooks };
}

function mergeHooks(existing: HooksFile, pm: "npm" | "pnpm"): HooksFile {
  const cmd = hookCommand(pm);
  const hooks = { ...existing.hooks };
  for (const name of HOOK_NAMES) {
    hooks[name] = [{ command: cmd }];
  }
  return { version: existing.version ?? 1, hooks };
}

function patchPackageJson(
  root: string,
  stenoVersion: string,
): void {
  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    writeFileSync(
      pkgPath,
      `${JSON.stringify(
        {
          name: "my-app",
          version: "0.0.0",
          private: true,
          type: "module",
          scripts: {
            "steno:ingest": "steno ingest",
            "steno:dev": "steno dev",
          },
          devDependencies: { [STENO_NPM_PACKAGE]: `^${stenoVersion}` },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    return;
  }

  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  pkg.scripts = pkg.scripts ?? {};
  if (!pkg.scripts["steno:ingest"]) {
    pkg.scripts["steno:ingest"] = "steno ingest";
  }
  if (!pkg.scripts["steno:dev"]) {
    pkg.scripts["steno:dev"] = "steno dev";
  }

  pkg.devDependencies = pkg.devDependencies ?? {};
  if ("steno" in pkg.devDependencies) {
    delete pkg.devDependencies.steno;
  }
  if (!pkg.devDependencies[STENO_NPM_PACKAGE]) {
    pkg.devDependencies[STENO_NPM_PACKAGE] = `^${stenoVersion}`;
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

async function initSqliteWithMigrations(sqliteAbs: string): Promise<void> {
  const prev = process.env.STENO_DB_MIGRATIONS_DIR;
  process.env.STENO_DB_MIGRATIONS_DIR = migrationsDir();
  try {
    const { createDb } = await import("@steno/db");
    const { close } = createDb(sqliteAbs);
    close();
  } finally {
    if (prev === undefined) delete process.env.STENO_DB_MIGRATIONS_DIR;
    else process.env.STENO_DB_MIGRATIONS_DIR = prev;
  }
}

/**
 * Create empty NDJSON log and migrated SQLite DB. If paths already exist, prompts
 * before overwriting (data loss). With `--yes`, existing files are left alone unless
 * `--reset-data` is passed.
 */
async function ensureProjectTelemetryStorage(
  root: string,
  eventsPath: string,
  sqlitePath: string,
  opts: { yes: boolean; resetData: boolean },
): Promise<boolean> {
  const eventsAbs = join(root, eventsPath);
  const sqliteAbs = join(root, sqlitePath);
  const eventsExists = existsSync(eventsAbs);
  const sqliteExists = existsSync(sqliteAbs);

  let replaceExisting = false;
  if (eventsExists || sqliteExists) {
    if (opts.resetData) {
      replaceExisting = true;
    } else if (!opts.yes) {
      const r = await prompts({
        type: "confirm",
        name: "replace",
        message:
          "Telemetry files already exist at the configured paths. Replace them? (All local hook log and DB data at those paths will be lost.)",
        initial: false,
      });
      if (r.replace === undefined) {
        console.error("Cancelled.");
        return false;
      }
      replaceExisting = Boolean(r.replace);
    } else {
      console.log(
        "[steno] Telemetry files already exist; left unchanged. Run init without --yes to replace after confirmation, or pass --reset-data to overwrite non-interactively.",
      );
    }
  }

  let telemetrySummary: string | null = null;
  try {
    if (!eventsExists) {
      writeFileSync(eventsAbs, "", "utf8");
    } else if (replaceExisting) {
      writeFileSync(eventsAbs, "", "utf8");
    }

    if (!sqliteExists) {
      await initSqliteWithMigrations(sqliteAbs);
    } else if (replaceExisting) {
      try {
        unlinkSync(sqliteAbs);
      } catch {
        // ignore — createDb may still fail with a clear error
      }
      await initSqliteWithMigrations(sqliteAbs);
    }

    if (!eventsExists || !sqliteExists) {
      telemetrySummary = `[steno] Telemetry ready: ${eventsPath} (NDJSON log) and ${sqlitePath} (SQLite).`;
    } else if (replaceExisting) {
      telemetrySummary = `[steno] Telemetry reset: ${eventsPath} and ${sqlitePath}.`;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[steno] Failed to create telemetry storage: ${msg}`);
    process.exitCode = 1;
    return false;
  }

  if (telemetrySummary) {
    console.log(telemetrySummary);
  }

  return true;
}

function writeStenoConfig(
  root: string,
  eventsPath: string,
  sqlitePath: string,
  port: number,
): void {
  const body = `/** Steno — paths relative to this repo root */
export default {
  logPath: ${JSON.stringify(eventsPath)},
  sqlitePath: ${JSON.stringify(sqlitePath)},
  uiPort: ${port},
};
`;
  writeFileSync(join(root, "steno.config.ts"), body, "utf8");
}

export async function runInit(argv: string[]): Promise<void> {
  const args = parseInitArgs(argv);
  const root = process.cwd();

  let pm = args.pm;
  let merge = args.merge;
  let eventsPath = args.eventsPath;
  let sqlitePath = args.sqlitePath;
  let port = args.port;

  if (args.yes && !args.hooksModeExplicit) {
    merge = false;
  }

  const hooksPath = join(root, ".cursor", "hooks.json");

  if (!args.yes) {
    if (!pm) {
      const r = await prompts({
        type: "select",
        name: "pm",
        message: "Hooks command: use npm or pnpm?",
        choices: [
          { title: "npm", value: "npm" },
          { title: "pnpm", value: "pnpm" },
        ],
        initial: 1,
      });
      if (r.pm === undefined) {
        console.error("Cancelled.");
        process.exitCode = 1;
        return;
      }
      pm = r.pm as "npm" | "pnpm";
    }

    if (existsSync(hooksPath) && !args.hooksModeExplicit) {
      const r = await prompts({
        type: "select",
        name: "mode",
        message: ".cursor/hooks.json already exists",
        choices: [
          { title: "Replace (full Steno hook set)", value: "replace" },
          { title: "Merge (only Steno hook commands)", value: "merge" },
        ],
        initial: 0,
      });
      if (r.mode === undefined) {
        console.error("Cancelled.");
        process.exitCode = 1;
        return;
      }
      merge = r.mode === "merge";
    }

    const r = await prompts([
      {
        type: "text",
        name: "eventsPath",
        message: "NDJSON log path (relative to repo root)",
        initial: eventsPath,
      },
      {
        type: "text",
        name: "sqlitePath",
        message: "SQLite DB path (relative to repo root)",
        initial: sqlitePath,
      },
      {
        type: "number",
        name: "port",
        message: "UI server port",
        initial: port,
      },
    ]);
    if (r.eventsPath === undefined) {
      console.error("Cancelled.");
      process.exitCode = 1;
      return;
    }
    eventsPath = String(r.eventsPath);
    sqlitePath = String(r.sqlitePath);
    port = Number(r.port) || port;
  }

  if (!pm) pm = "pnpm";

  mkdirSync(join(root, ".cursor"), { recursive: true });
  mkdirSync(join(root, dirname(eventsPath)), { recursive: true });
  mkdirSync(join(root, dirname(sqlitePath)), { recursive: true });

  const ok = await ensureProjectTelemetryStorage(root, eventsPath, sqlitePath, {
    yes: args.yes,
    resetData: args.resetData,
  });
  if (!ok) {
    process.exitCode = 1;
    return;
  }

  writeStenoConfig(root, eventsPath, sqlitePath, port);
  patchPackageJson(root, args.stenoVersion);

  let hooksJson: HooksFile;

  if (merge && existsSync(hooksPath)) {
    try {
      const existing = JSON.parse(
        readFileSync(hooksPath, "utf8"),
      ) as HooksFile;
      hooksJson = mergeHooks(existing, pm);
    } catch {
      hooksJson = buildHooksJson(pm);
    }
  } else {
    hooksJson = buildHooksJson(pm);
  }

  writeFileSync(hooksPath, `${JSON.stringify(hooksJson, null, 2)}\n`, "utf8");

  console.log(
    `Wrote steno.config.ts, .cursor/hooks.json, updated package.json (telemetry: ${eventsPath}, ${sqlitePath})`,
  );
  console.log(`Run: pnpm install (or npm install), then test with:`);
  console.log(
    `  echo '{"hook_event_name":"stop"}' | ${pm} run steno:ingest --silent`,
  );
  console.log(`Start the bundled UI + API with: ${pm} run steno:dev`);
}
