import { runDev } from "./dev.js";
import { readInstalledStenoPackageVersion, runInit } from "./init.js";
import { runIngest } from "@steno/core/ingest";

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "ingest" || cmd === undefined) {
    await runIngest();
    return;
  }

  if (cmd === "init") {
    await runInit(rest);
    return;
  }

  if (cmd === "dev") {
    await runDev(rest);
    return;
  }

  if (cmd === "help" || cmd === "-h" || cmd === "--help") {
    console.log(`steno — Cursor hook telemetry

Usage:
  steno ingest          Read hook JSON from stdin, append NDJSON (default)
  steno init [opts]     Scaffold steno.config.ts, package.json scripts (steno:ingest, steno:dev), hooks
  steno dev [--build]   Serve API + UI on one port (bundled UI, or apps/ui/dist if present)
  steno help            Show this message

dev options:
  --build               In a monorepo with apps/ui, run pnpm --filter @steno/ui build first

init options:
  --yes                 Non-interactive defaults
  --pm npm|pnpm         Package manager for hooks.json command
  --merge               Merge into existing .cursor/hooks.json
  --replace             Replace .cursor/hooks.json (default)
  --events-path <path>  Relative NDJSON path (default: steno/events.ndjson)
  --sqlite-path <path>  Relative SQLite path (default: steno/steno.db)
  --port <n>            UI server port (default: 8787)
  --steno-version <ver> devDependency version (default: ${readInstalledStenoPackageVersion()})
`);
    return;
  }

  console.error(`Unknown command: ${cmd}. Run "steno help".`);
  process.exitCode = 1;
}

void main();
