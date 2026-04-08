import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * When `pnpm --filter @steno/server dev` runs, `process.cwd()` is
 * `apps/server`, not the monorepo root — NDJSON/SQLite paths would be wrong.
 * Walk up until we find the workspace root or a `.cursor/hooks.json`.
 */
export function findRepoRootFrom(startDir: string): string {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    if (existsSync(join(dir, ".cursor", "hooks.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir);
}

export function getRepoRoot(): string {
  const fromEnv =
    process.env.STENO_PROJECT?.trim() ||
    process.env.STENOGRAPHER_PROJECT?.trim() ||
    process.env.CURSOR_PROJECT_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  return findRepoRootFrom(process.cwd());
}
