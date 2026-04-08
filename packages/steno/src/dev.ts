import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRepoRoot } from "@steno/core/ingest";

const here = dirname(fileURLToPath(import.meta.url));

/** Bundled `cli.mjs`: assets sit in `dist/`. Running `tsx src/cli.ts` uses `src/` → fall back to `../dist/`. */
function resolveBundled(name: string): string {
  const nextToSelf = join(here, name);
  if (existsSync(nextToSelf)) return nextToSelf;
  return join(here, "..", "dist", name);
}

function serverPath(): string {
  return resolveBundled("server.mjs");
}

function migrationsDir(): string {
  return resolveBundled("drizzle");
}

function monorepoUiAppPath(repoRoot: string): string {
  return join(repoRoot, "apps", "ui", "package.json");
}

function runUiBuild(repoRoot: string): Promise<number | null> {
  return new Promise((resolveCode, reject) => {
    const child = spawn("pnpm", ["--filter", "@steno/ui", "build"], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolveCode(code));
  });
}

/** Static UI shipped next to `cli.mjs` (`dist/ui`, or `dist/ui` when running from `src/` via tsx). */
function bundledUiDist(): string | null {
  const nextToSelf = join(here, "ui");
  if (existsSync(join(nextToSelf, "index.html"))) return nextToSelf;
  const fallback = join(here, "..", "dist", "ui");
  if (existsSync(join(fallback, "index.html"))) return fallback;
  return null;
}

function resolveUiDist(repoRoot: string): string | null {
  const projectUi = resolve(repoRoot, "apps", "ui", "dist");
  if (existsSync(join(projectUi, "index.html"))) return projectUi;
  return bundledUiDist();
}

/**
 * Serve API + built SPA from one port (`steno dev`).
 * Uses `apps/ui/dist` when present, otherwise the UI bundled inside the `steno` package.
 */
export async function runDev(argv: string[]): Promise<void> {
  const repoRoot = resolveRepoRoot();
  const buildFirst = argv.includes("--build");

  if (buildFirst) {
    if (!existsSync(monorepoUiAppPath(repoRoot))) {
      console.log(
        "[steno] --build: no apps/ui in this project; using bundled UI from the steno package.",
      );
    } else {
      console.log("[steno] Building UI…");
      const code = await runUiBuild(repoRoot);
      if (code !== 0) {
        console.error("[steno] UI build failed.");
        process.exitCode = code ?? 1;
        return;
      }
    }
  }

  const uiDist = resolveUiDist(repoRoot);
  if (!uiDist) {
    console.error(
      "[steno] No UI found. Reinstall or rebuild the steno package (dist/ui missing).",
    );
    process.exitCode = 1;
    return;
  }

  const entry = serverPath();
  if (!existsSync(entry)) {
    console.error(
      `[steno] Missing bundled server at ${entry}. Rebuild the steno package (pnpm --filter steno build).`,
    );
    process.exitCode = 1;
    return;
  }

  const child = spawn(process.execPath, [entry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      STENO_PROJECT: repoRoot,
      STENO_STATIC_ROOT: uiDist,
      STENO_DB_MIGRATIONS_DIR: migrationsDir(),
    },
    stdio: "inherit",
  });

  child.on("error", (err) => {
    console.error("[steno] Failed to start server:", err);
    process.exitCode = 1;
  });

  await new Promise<void>((res) => {
    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        process.exitCode = code;
      }
      res();
    });
  });
}
