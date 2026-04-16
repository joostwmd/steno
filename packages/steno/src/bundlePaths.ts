import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Directory containing the running CLI module (`dist/` when published, or `src/` in dev). */
export const bundleDir = dirname(fileURLToPath(import.meta.url));

/** Bundled `cli.mjs`: assets sit in `dist/`. Running `tsx src/cli.ts` uses `src/` → fall back to `../dist/`. */
export function resolveBundled(name: string): string {
  const nextToSelf = join(bundleDir, name);
  if (existsSync(nextToSelf)) return nextToSelf;
  return join(bundleDir, "..", "dist", name);
}

export function migrationsDir(): string {
  return resolveBundled("drizzle");
}
