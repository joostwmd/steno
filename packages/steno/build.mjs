import * as esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(pkgRoot, "..", "..");

/** Resolve `@steno/*` to built `dist/*.js` so the publishable package needs no workspace devDependencies. */
function stenoWorkspacePlugin() {
  const roots = {
    core: join(repoRoot, "packages", "core"),
    api: join(repoRoot, "packages", "api"),
    db: join(repoRoot, "packages", "db"),
  };
  return {
    name: "steno-workspace",
    setup(build) {
      build.onResolve({ filter: /^@steno\/(core|api|db)$/ }, (args) => {
        const name = args.path.slice("@steno/".length);
        const root = roots[name];
        if (!root) return;
        return { path: join(root, "dist", "index.js") };
      });
      build.onResolve({ filter: /^@steno\/(core|api|db)\// }, (args) => {
        const m = args.path.match(/^@steno\/(core|api|db)\/(.+)$/);
        if (!m) return;
        const [, name, sub] = m;
        const root = roots[name];
        if (!root) return;
        return { path: join(root, "dist", `${sub}.js`) };
      });
    },
  };
}
const outDir = join(pkgRoot, "dist");
const drizzleSrc = join(repoRoot, "packages", "db", "drizzle");
const drizzleDest = join(outDir, "drizzle");
const uiSrc = join(repoRoot, "apps", "ui", "dist");
const uiDest = join(outDir, "ui");

const uiBuild = spawnSync(
  "pnpm",
  ["--filter", "@steno/ui", "build"],
  { cwd: repoRoot, stdio: "inherit", shell: true },
);
if (uiBuild.status !== 0) {
  process.exit(uiBuild.status ?? 1);
}
if (!existsSync(join(uiSrc, "index.html"))) {
  console.error(
    `[steno] Expected UI at ${uiSrc} after @steno/ui build (missing index.html).`,
  );
  process.exit(1);
}

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: true,
  logLevel: "info",
  external: ["better-sqlite3", "jiti", "prompts"],
  packages: "bundle",
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  ...common,
  plugins: [stenoWorkspacePlugin()],
  entryPoints: [join(pkgRoot, "src", "cli.ts")],
  outfile: join(outDir, "cli.mjs"),
  banner: { js: "#!/usr/bin/env node\n" },
});

await esbuild.build({
  ...common,
  plugins: [stenoWorkspacePlugin()],
  entryPoints: [join(repoRoot, "apps", "server", "src", "index.ts")],
  outfile: join(outDir, "server.mjs"),
});

mkdirSync(drizzleDest, { recursive: true });
cpSync(drizzleSrc, drizzleDest, { recursive: true });

mkdirSync(uiDest, { recursive: true });
cpSync(uiSrc, uiDest, { recursive: true });
