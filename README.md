# Steno

**Steno** records [Cursor](https://cursor.com) hook telemetry: each hook sends JSON on stdin to the `steno` CLI, which appends **NDJSON** and keeps a **SQLite** database in sync for the web UI.

This repository is a **pnpm monorepo**. The installable surface is the **`@joostwmd/steno`** package ([`packages/steno`](packages/steno)): a bundled CLI plus embedded API server and static UI.

## Install (from npm)

Prerequisites: **Node.js 20+** and an environment where **`better-sqlite3`** can install (prebuilds exist for common platforms; otherwise a native build toolchain may be required).

```bash
pnpm add -D @joostwmd/steno
# or
npm install --save-dev @joostwmd/steno
```

The binary is still named **`steno`** (see `bin` in the package). Use **`pnpm exec steno`**, **`npx steno`**, or npm scripts that call `steno`.

Scaffold config and hooks (uses the installed package version by default for `package.json`):

```bash
pnpm exec steno init
# or
npx steno init --yes
```

## Requirements (monorepo contributors)

- **Node.js** 20+ (22 LTS recommended)
- **pnpm** 9 (`packageManager` is pinned in root `package.json`)
- For installs from a tarball or npm: a working toolchain for **`better-sqlite3`** when prebuilds are unavailable

## Monorepo layout

| Path | Role |
|------|------|
| `packages/core` | Hook ingest, `steno.config.ts` loading |
| `packages/api` | tRPC router shared by server and UI |
| `packages/db` | Drizzle + SQLite (`better-sqlite3`), migrations in `packages/db/drizzle` |
| `packages/steno` | **`steno` CLI** — esbuild bundle (`cli.mjs`, `server.mjs`), copied migrations + **built UI** under `dist/` |
| `apps/server` | Hono + tRPC server (used from source during monorepo dev; also bundled into `@joostwmd/steno`) |
| `apps/ui` | Vite + React viewer (production build is copied into the `steno` package) |

## Contributing: clone and run

```bash
pnpm install
pnpm build
```

- **Monorepo dev (hot reload):** `pnpm dev` — runs `@steno/server` with `tsx` and `@steno/ui` with Vite (UI at [http://127.0.0.1:5173](http://127.0.0.1:5173), API at [http://127.0.0.1:8787](http://127.0.0.1:8787)).
- **Same as consumers (bundled CLI):** `pnpm exec steno dev` — one port serves API + static UI from the `@joostwmd/steno` build (after `pnpm build` or `pnpm --filter @joostwmd/steno build`).

### Useful scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Build all workspace packages (including `@joostwmd/steno` with embedded UI) |
| `pnpm dev` | Server + Vite UI in parallel |
| `pnpm test` | Vitest in `@steno/core` and `@steno/api` |
| `pnpm steno:ingest` | Run `steno ingest` (expects stdin JSON from a hook) |
| `pnpm steno:dev` | Run `steno dev` (bundled API + UI) |
| `pnpm db:generate` / `pnpm db:push` | Drizzle (see `@steno/db`) |
| `pnpm audit` / `pnpm audit:fix` | Security audit across the workspace (see note below). |

**Dependency / security audits:** This repo uses **pnpm** and **`workspace:`** links, so plain **`npm audit` at the root** does not apply (no `package-lock.json`, and npm does not understand `workspace:*`). Use **`pnpm run audit`** instead. If npm returns **410** on audit endpoints, the registry has moved to a newer advisory API and your **pnpm** version may need an upgrade—watch [pnpm releases](https://github.com/pnpm/pnpm/releases). **GitHub Dependabot** on this repository is another good layer for alerts.

## Configuration

Add **`steno.config.ts`** at the **project root** (the repo Cursor opens). Example:

```ts
/** Paths relative to repo root */
export default {
  logPath: "steno/events.ndjson",
  sqlitePath: "steno/steno.db",
  uiPort: 8787,
};
```

The CLI loads this config with **jiti** (TypeScript without a separate compile step).

## Cursor hooks

Point hooks at your package manager so `steno ingest` runs with the repo root as cwd, for example in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "afterAgentResponse": [{ "command": "npm run steno:ingest --silent" }]
  }
}
```

Scaffold config, `package.json` scripts, and hooks interactively:

```bash
pnpm exec steno init
# or non-interactive:
pnpm exec steno init --yes
```

Run `pnpm exec steno help` for all `init` flags. `steno init` adds a **`devDependency` on `@joostwmd/steno`** and scripts **`steno:ingest`** / **`steno:dev`**; by default **`--steno-version`** matches the version of the running CLI (from its `package.json`).

## CLI commands (`steno`)

| Command | Description |
|---------|-------------|
| `steno ingest` | Read one hook JSON line from **stdin**, append NDJSON, update SQLite (default if no subcommand). |
| `steno init` | Create `steno.config.ts`, wire `package.json` scripts (`steno:ingest`, `steno:dev`), write `.cursor/hooks.json`. |
| `steno dev` | Start bundled server: **API + UI** on `uiPort` (default **8787**). Uses **`apps/ui/dist`** if present, otherwise the **UI shipped inside the package** (`dist/ui`). |
| `steno dev --build` | In a monorepo that contains `apps/ui`, run `pnpm --filter @steno/ui build` first; otherwise uses bundled UI. |
| `steno help` | Usage. |

From a project that depends on `@joostwmd/steno`, use **`pnpm exec steno`** / **`npx steno`** or npm scripts so `node_modules/.bin` is used.

## Building and testing the installable tarball

From `packages/steno` (runs `prepack` → full build):

```bash
cd packages/steno
pnpm pack --pack-destination /tmp
```

Install elsewhere:

```bash
cd /path/to/other-project
npm install /tmp/joostwmd-steno-0.1.0.tgz
npx steno help
npx steno dev
```

## Publishing to npm (`@joostwmd/steno`)

1. **npm account:** Use (or create) the **`joostwmd`** npm user or org so the **`@joostwmd`** scope is yours. Enable **two-factor authentication** on npm.
2. **Login:** `npm login` locally, or configure **Trusted Publishers (OIDC)** on the npm package and GitHub (see [npm trusted publishers](https://docs.npmjs.com/trusted-publishers)).
3. **Publish from repo root:**

   ```bash
   pnpm publish --filter @joostwmd/steno --access public
   ```

   Scoped packages must be published **`public`** unless you use a private registry.

4. **CI:** [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml) builds and runs `pnpm publish --filter @joostwmd/steno --access public --no-git-checks --provenance`. Add an **`NPM_TOKEN`** repository secret (automation token) unless you switch the job to pure OIDC per npm’s docs.

## Environment variables (reference)

| Variable | Purpose |
|----------|---------|
| `STENO_PROJECT` | Absolute path to project root (server resolves config and paths). |
| `STENO_UI_PORT` | Overrides `uiPort` from config. |
| `STENO_STATIC_ROOT` | Directory with `index.html` for static + SPA fallback (set automatically by `steno dev`). |
| `STENO_DB_MIGRATIONS_DIR` | Drizzle migrations folder (set automatically for the bundled server). |

Legacy aliases `STENOGRAPHER_*` may still be read where noted in code.

## License

MIT — see [LICENSE](LICENSE).
