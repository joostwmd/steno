import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";

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

  console.log(`Wrote steno.config.ts, .cursor/hooks.json, updated package.json`);
  console.log(`Run: pnpm install (or npm install), then test with:`);
  console.log(
    `  echo '{"hook_event_name":"stop"}' | ${pm} run steno:ingest --silent`,
  );
  console.log(`Start the bundled UI + API with: ${pm} run steno:dev`);
}
